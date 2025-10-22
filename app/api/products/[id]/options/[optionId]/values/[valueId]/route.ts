import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string; optionId: string; valueId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const valueId = Number(params.valueId)
    if (!Number.isFinite(valueId)) return NextResponse.json({ message: 'Invalid valueId' }, { status: 400 })

    const body = await req.json().catch(() => null) as { value?: string; hexColor?: string | null } | null
    const data: any = {}
    if (typeof body?.value === 'string') data.value = body.value.trim().toUpperCase() // Convertir a mayúsculas
    data.hexColor = typeof body?.hexColor === 'string' ? body.hexColor.trim() : null

    const updated = await prisma.productOptionValue.update({
      where: { id: valueId },
      data,
    }).catch((e: any) => {
      if (e?.code === 'P2002') return null
      throw e
    })

    if (!updated) return NextResponse.json({ message: 'Ya existe ese valor para esta opción' }, { status: 409 })

    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; optionId: string; valueId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const valueId = Number(params.valueId)
    if (!Number.isFinite(valueId)) return NextResponse.json({ message: 'Invalid valueId' }, { status: 400 })

    const inUse = await prisma.variantOptionValue.count({ where: { valueId } })
    if (inUse > 0) return NextResponse.json({ message: 'No se puede eliminar: existen variantes que usan este valor' }, { status: 400 })

    await prisma.productOptionValue.delete({ where: { id: valueId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

