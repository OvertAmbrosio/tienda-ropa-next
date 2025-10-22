import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    if (!Number.isFinite(productId)) return NextResponse.json({ message: 'Invalid productId' }, { status: 400 })

    const items = await prisma.productFeature.findMany({ where: { productId }, orderBy: { id: 'desc' } })
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    if (!Number.isFinite(productId)) return NextResponse.json({ message: 'Invalid productId' }, { status: 400 })

    const body = await req.json().catch(() => null) as { name?: string; value?: string } | null
    const name = String(body?.name || '').trim().toUpperCase() // Convertir a mayúsculas
    const value = String(body?.value || '').trim().toUpperCase() // Convertir a mayúsculas

    if (!name || !value) return NextResponse.json({ message: 'Nombre y valor requeridos' }, { status: 400 })

    const item = await prisma.productFeature.create({ data: { productId, name, value } })
    return NextResponse.json({ item }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
