import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

// Transiciones válidas de estado
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELED'],
  PAID: ['ACCEPTED', 'CANCELED'],
  ACCEPTED: ['SHIPPING', 'CANCELED'],
  SHIPPING: ['COMPLETED', 'CANCELED'],
  COMPLETED: [], // Estado final
  CANCELED: [], // Estado final
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'CASHIER'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => null) as { status?: string } | null
    const newStatus = body?.status

    if (!newStatus || typeof newStatus !== 'string') {
      return NextResponse.json({ message: 'Estado requerido' }, { status: 400 })
    }

    // Validar que el nuevo estado existe
    const validStatuses = ['PENDING', 'PAID', 'ACCEPTED', 'SHIPPING', 'COMPLETED', 'CANCELED']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ message: 'Estado inválido' }, { status: 400 })
    }

    // Obtener venta actual
    const sale = await prisma.sale.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!sale) {
      return NextResponse.json({ message: 'Venta no encontrada' }, { status: 404 })
    }

    // Validar transición
    const allowedTransitions = VALID_TRANSITIONS[sale.status] || []
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { message: `No se puede cambiar de ${sale.status} a ${newStatus}` },
        { status: 400 }
      )
    }

    // Actualizar estado
    const updated = await prisma.sale.update({
      where: { id },
      data: { status: newStatus as any },
      select: { id: true, status: true, total: true },
    })

    return NextResponse.json({ item: updated })
  } catch (error: any) {
    const message = error?.message || 'Error al actualizar estado'
    console.error('[PATCH /api/sales/:id] Error:', message)
    return NextResponse.json({ message }, { status: 500 })
  }
}
