import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

export async function GET(request: Request) {
  await ensureDbReady()
  try {
    const url = new URL(request.url)
    const code = (url.searchParams.get('code') || '').trim().toUpperCase()
    if (!code) {
      return NextResponse.json({ message: 'Falta el código de rastreo' }, { status: 400 })
    }

    const sale = await (prisma as any).sale.findFirst({
      where: { trackingCode: code },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageBase64: true } },
          },
        },
        histories: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!sale) {
      return NextResponse.json({ message: 'No se encontró una orden con ese código' }, { status: 404 })
    }

    const itemsCount = ((sale.items as any[]) || []).reduce((sum: number, it: any) => sum + it.quantity, 0)
    const thumbs = (sale.items as any[]).map((it: any) => ({
      id: it.product.id,
      name: it.product.name,
      imageBase64: (it.product as any).imageBase64 || null,
      qty: it.quantity,
    }))

    return NextResponse.json({
      sale: {
        id: sale.id,
        trackingCode: (sale as any).trackingCode,
        status: sale.status,
        createdAt: sale.createdAt,
        total: sale.total,
      },
      itemsCount,
      thumbs,
      histories: (sale.histories as any[]).map((h: any) => ({
        id: h.id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        comment: h.comment,
        performedBy: h.performedBy,
        createdAt: h.createdAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error' }, { status: 500 })
  }
}
