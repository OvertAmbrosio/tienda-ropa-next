import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    const body = await request.json()
    const name = String(body?.name ?? '').trim().toUpperCase()
    if (!name) return NextResponse.json({ message: 'Nombre requerido' }, { status: 400 })

    const existing = await prisma.customer.findFirst({ where: { name }, select: { id: true } })
    if (existing && existing.id !== id) {
      return NextResponse.json({ message: 'Ya existe un cliente con ese nombre' }, { status: 409 })
    }

    const updated = await prisma.customer.update({ where: { id }, data: { name } })
    return NextResponse.json({ item: updated })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    // Optional safety: prevent delete if has sales
    const used = await prisma.sale.count({ where: { customerId: id } })
    if (used > 0) {
      return NextResponse.json({ message: 'No se puede eliminar: cliente usado en ventas' }, { status: 400 })
    }

    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}
