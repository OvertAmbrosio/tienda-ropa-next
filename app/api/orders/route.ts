import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const pageParam = Number(url.searchParams.get("page") || "1");
    const pageSizeParam = Number(url.searchParams.get("pageSize") || "20");
    const orderIdParam = url.searchParams.get("orderId");
    const codeParam = url.searchParams.get("code") || url.searchParams.get("trackingCode");

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize =
      Number.isFinite(pageSizeParam) &&
      pageSizeParam > 0 &&
      pageSizeParam <= 100
        ? pageSizeParam
        : 20;

    const queryRaw = (orderIdParam || codeParam || "").trim();
    const maybeOrderId = queryRaw && /^\d+$/.test(queryRaw) ? Number(queryRaw) : undefined;
    const whereAny: any = {};
    if (queryRaw) {
      if (typeof maybeOrderId === "number" && Number.isInteger(maybeOrderId) && maybeOrderId > 0) {
        whereAny.id = maybeOrderId;
      } else {
        // Buscar por trackingCode (texto)
        whereAny.trackingCode = queryRaw.toUpperCase();
      }
    } else {
      // Sin búsqueda, limitar a pendientes por defecto
      whereAny.status = { notIn: ["COMPLETED", "CANCELED"] as any };
    }

    const [total, items] = await Promise.all([
      prisma.sale.count({ where: whereAny as Prisma.SaleWhereInput }),
      prisma.sale.findMany({
        where: whereAny as Prisma.SaleWhereInput,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      items,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (e) {
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
