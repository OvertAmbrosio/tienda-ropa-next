import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasAnyRole } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Default to today if no dates provided
    const today = new Date();
    const defaultStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 1);

    let start: Date;
    let end: Date;

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      start = defaultStart;
    }

    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = defaultEnd;
    }

    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            phone: true,
            documentNumber: true,
          },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true } },
            variant: { select: { id: true, optionKey: true } },
          },
        },
        histories: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ items: sales });
  } catch (e) {
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, ["ADMIN", "CASHIER"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const customerName =
      typeof body?.customerName === "string" ? body.customerName.trim() : null;
    const customerNameUpper = customerName ? customerName.toUpperCase() : null;
    const saleDateStr =
      typeof body?.saleDate === "string" ? body.saleDate : null;
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length)
      return NextResponse.json({ message: "Sin items" }, { status: 400 });
    for (const it of items) {
      const q = Number(it?.quantity);
      const pid = it?.productId !== undefined ? Number(it?.productId) : NaN;
      const vid = it?.variantId !== undefined ? Number(it?.variantId) : NaN;
      if (
        (!Number.isFinite(pid) && !Number.isFinite(vid)) ||
        !Number.isInteger(q) ||
        q <= 0
      ) {
        return NextResponse.json(
          { message: "Datos de item inválidos" },
          { status: 400 }
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      // Load products and variants involved
      type ProductRow = {
        id: number;
        name: string;
        price: number;
        stock: number;
      };
      type VariantRow = {
        id: number;
        productId: number;
        price: number | null;
        stock: number;
        isActive: boolean;
        optionKey: string;
        product: { id: number; name: string; price: number; stock: number };
      };
      const productIds: number[] = items
        .filter((it: any) => it.productId && !it.variantId)
        .map((it: any) => Number(it.productId));
      const variantIds: number[] = items
        .filter((it: any) => it.variantId)
        .map((it: any) => Number(it.variantId));

      const products = productIds.length
        ? ((await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, price: true, stock: true },
          })) as ProductRow[])
        : [];
      const variants = variantIds.length
        ? ((await tx.productVariant.findMany({
            where: { id: { in: variantIds } },
            include: {
              product: {
                select: { id: true, name: true, price: true, stock: true },
              },
            },
          })) as unknown as VariantRow[])
        : [];

      const productById = new Map<number, ProductRow>(
        products.map((p) => [p.id, p])
      );
      const variantById = new Map<number, VariantRow>(
        variants.map((v) => [v.id, v])
      );

      // Validate stock
      for (const it of items as Array<{
        productId?: number;
        variantId?: number;
        quantity: number;
      }>) {
        const qty = Number(it.quantity);
        if (it.variantId) {
          const v = variantById.get(Number(it.variantId));
          if (!v) throw new Error("Variante no encontrada");
          if (!v.isActive) throw new Error("Variante inactiva");
          if (v.stock < qty)
            throw new Error(
              `Stock insuficiente para ${v.product.name} (${
                v.optionKey || "variante"
              })`
            );
        } else {
          const p = productById.get(Number(it.productId!)) as
            | ProductRow
            | undefined;
          if (!p) throw new Error("Producto no encontrado");
          if (p.stock < qty)
            throw new Error(`Stock insuficiente para ${p.name}`);
        }
      }

      let total = 0;
      const saleDate = saleDateStr ? new Date(saleDateStr) : new Date();

      // Resolve customer (optional): find by name insensitive, else create
      let customerId: number | null = null;
      if (customerNameUpper && customerNameUpper.length > 0) {
        const existing = await tx.customer.findFirst({
          where: { name: customerNameUpper },
          select: { id: true },
        });
        if (existing) customerId = existing.id;
        else {
          const createdCustomer = await tx.customer.create({
            data: { name: customerNameUpper },
          });
          customerId = createdCustomer.id;
        }
      }

      const sale = await tx.sale.create({
        data: {
          customerName: customerNameUpper || null,
          customerId,
          saleDate,
          total: 0, // temp, update after creating items
          status: "COMPLETED", // Venta del admin ya está completada
          source: "ADMIN", // Venta creada desde el panel admin
        },
      });

      for (const it of items as Array<{
        productId?: number;
        variantId?: number;
        quantity: number;
      }>) {
        const quantity = Number(it.quantity);
        if (it.variantId) {
          const v = variantById.get(Number(it.variantId))!;
          const unitPrice = (v.price ?? v.product.price) as number;
          const lineTotal = unitPrice * quantity;
          total += lineTotal;
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: v.productId,
              variantId: v.id,
              quantity,
              unitPrice,
              lineTotal,
            },
          });
          await tx.productVariant.update({
            where: { id: v.id },
            data: { stock: { decrement: quantity } },
          });
          const dec = Math.min(quantity, v.product.stock);
          if (dec > 0) {
            await tx.product.update({
              where: { id: v.productId },
              data: { stock: { decrement: dec } },
            });
          }
        } else {
          const p = productById.get(Number(it.productId))!;
          const unitPrice = p.price as number;
          const lineTotal = unitPrice * quantity;
          total += lineTotal;
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: p.id,
              quantity,
              unitPrice,
              lineTotal,
            },
          });
          await tx.product.update({
            where: { id: p.id },
            data: { stock: { decrement: quantity } },
          });
        }
      }

      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: { total },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, price: true } },
              variant: { select: { id: true, optionKey: true } },
            },
          },
        },
      });
      return updated;
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Internal error";
    const code = msg?.toLowerCase().includes("stock") ? 400 : 500;
    return NextResponse.json({ message: msg }, { status: code });
  }
}
