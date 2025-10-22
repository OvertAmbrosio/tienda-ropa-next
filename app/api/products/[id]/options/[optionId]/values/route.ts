import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string; optionId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const optionId = Number(params.optionId)
    if (!Number.isFinite(optionId)) return NextResponse.json({ message: 'Invalid optionId' }, { status: 400 })

    const values = await prisma.productOptionValue.findMany({ where: { optionId }, orderBy: { id: 'asc' } })
    return NextResponse.json({ items: values })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string; optionId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const optionId = Number(params.optionId)
    if (!Number.isFinite(optionId)) return NextResponse.json({ message: 'Invalid optionId' }, { status: 400 })

    const body = await req.json().catch(() => null) as { value?: string; hexColor?: string | null } | null
    const value = String(body?.value || '').trim().toUpperCase() // Convertir a mayúsculas
    const hexColor = typeof body?.hexColor === 'string' ? body?.hexColor.trim() : null

    if (!value) return NextResponse.json({ message: 'Valor requerido' }, { status: 400 })

    const created = await prisma.productOptionValue.create({
      data: { optionId, value, hexColor },
    }).catch((e: any) => {
      if (e?.code === 'P2002') return null
      throw e
    })

    if (!created) return NextResponse.json({ message: 'El valor ya existe para esta opción' }, { status: 409 })

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

