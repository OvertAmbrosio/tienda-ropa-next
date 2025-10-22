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

    const options = await prisma.productOption.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
      include: {
        values: { orderBy: { id: 'asc' } },
      },
    })

    return NextResponse.json({ items: options })
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

    const body = await req.json().catch(() => null) as { name?: string; position?: number } | null
    const name = String(body?.name || '').trim().toUpperCase() // Convertir a mayúsculas
    const position = Number.isFinite(body?.position) ? Number(body?.position) : 0

    if (!name) return NextResponse.json({ message: 'Nombre requerido' }, { status: 400 })

    const created = await prisma.productOption.create({
      data: { productId, name, position },
    }).catch((e: any) => {
      if (e?.code === 'P2002') return null
      throw e
    })

    if (!created) return NextResponse.json({ message: 'La opción ya existe' }, { status: 409 })

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
