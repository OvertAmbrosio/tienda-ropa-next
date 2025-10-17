import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  await ensureDbReady()
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => null) as { status?: string } | null
    const newStatus = body?.status

    // Solo permitir cambio de PENDING a PAID desde endpoint público
    if (newStatus !== 'PAID') {
      return NextResponse.json(
        { message: 'Solo se puede marcar como pagada desde checkout' },
        { status: 400 }
      )
    }

    // Obtener orden actual
    const sale = await prisma.sale.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!sale) {
      return NextResponse.json({ message: 'Orden no encontrada' }, { status: 404 })
    }

    // Solo permitir si está en PENDING
    if (sale.status !== 'PENDING') {
      return NextResponse.json(
        { message: `No se puede pagar una orden en estado ${sale.status}` },
        { status: 400 }
      )
    }

    // Actualizar a PAID
    const updated = await prisma.sale.update({
      where: { id },
      data: { status: 'PAID' as any },
      select: { id: true, status: true, total: true },
    })

    return NextResponse.json({ item: updated })
  } catch (error: any) {
    const message = error?.message || 'Error al procesar el pago'
    console.error('[PATCH /api/public/orders/:id] Error:', message)
    return NextResponse.json({ message }, { status: 500 })
  }
}
