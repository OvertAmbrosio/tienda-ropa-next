import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    const body = await req.json()
    const { stockToAdd } = body

    if (!Number.isFinite(stockToAdd) || stockToAdd <= 0) {
      return NextResponse.json({ message: 'stockToAdd debe ser un número positivo' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 })

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: product.stock + stockToAdd },
    })

    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
