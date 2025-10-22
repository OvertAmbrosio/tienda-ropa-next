import { NextResponse } from "next/server";
import { prisma, ensureDbReady } from "@/lib/prisma";
import { getSessionUser, hasAnyRole } from "@/lib/auth";

export async function GET(req: Request) {
  console.log(" GET /api/products");
  await ensureDbReady();
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const includeCounts = url.searchParams.get("includeCounts") === "true";
    const includeVariants = url.searchParams.get("includeVariants") === "true";
    const onlyWithVariants = url.searchParams.get("onlyWithVariants") === "true";

    // Configurar el WHERE condicional
    const whereClause = onlyWithVariants ? {
      variants: {
        some: {
          AND: [
            { optionKey: { not: "DEFAULT" } },
            { isActive: true },
            { stock: { gt: 0 } }
          ]
        }
      }
    } : {};

    const items = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        ...(includeCounts && {
          _count: {
            select: {
              variants: true,
              features: true,
            },
          },
        }),
        ...(includeVariants && {
          variants: {
            include: {
              values: {
                include: {
                  value: {
                    include: {
                      option: true,
                    },
                  },
                },
              },
            },
          },
        }),
        // Siempre incluir variantes para calcular stock total
        ...(!includeVariants && {
          variants: {
            select: {
              stock: true,
            },
          },
        }),
      },
    });

    // Calcular stock total de variantes para cada producto
    const itemsWithTotalStock = items.map((item: any) => {
      const totalStock = item.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      return {
        ...item,
        stock: totalStock, // Reemplazar stock del producto con el total de variantes
      };
    });

    // Si includeVariants, formatear los datos para incluir los valores de las opciones
    if (includeVariants) {
      const formattedItems = itemsWithTotalStock.map((product: any) => ({
        ...product,
        variants: product.variants.map((variant: any) => ({
          ...variant,
          values: variant.values.map((vo: any) => ({
            optionName: vo.value.option.name,
            value: vo.value.value,
            hexColor: vo.value.hexColor,
          })),
        })),
      }));
      return NextResponse.json({ items: formattedItems });
    }

    return NextResponse.json({ items: itemsWithTotalStock });
  } catch (e) {
    console.log({ e });
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureDbReady();
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, ["ADMIN", "MAINTAINER"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const price = Number(body?.price);
    const entryDate = body?.entryDate ? new Date(body.entryDate) : new Date();
    const imageBase64 =
      typeof body?.imageBase64 === "string" ? body.imageBase64.trim() : null;

    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    // Crear producto base con stock 0 (el stock real será manejado por las variantes)
    // Ya NO creamos una variante DEFAULT automáticamente
    const created = await prisma.product.create({
      data: { name, price, stock: 0, entryDate, imageBase64: imageBase64 || null },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
