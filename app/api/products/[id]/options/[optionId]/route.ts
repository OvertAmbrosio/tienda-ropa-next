import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string; optionId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    const optionId = Number(params.optionId)
    if (!Number.isFinite(productId) || !Number.isFinite(optionId)) return NextResponse.json({ message: 'Invalid ids' }, { status: 400 })

    const body = await req.json().catch(() => null) as { name?: string; position?: number } | null
    const data: any = {}
    if (typeof body?.name === 'string') data.name = body.name.trim().toUpperCase() // Convertir a mayúsculas
    if (Number.isFinite(body?.position)) data.position = Number(body?.position)

    if (Object.keys(data).length === 0) return NextResponse.json({ message: 'No hay cambios' }, { status: 400 })

    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data,
    }).catch((e: any) => {
      if (e?.code === 'P2002') return null
      throw e
    })

    if (!updated) return NextResponse.json({ message: 'Ya existe una opción con ese nombre' }, { status: 409 })

    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; optionId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const optionId = Number(params.optionId)
    if (!Number.isFinite(optionId)) return NextResponse.json({ message: 'Invalid optionId' }, { status: 400 })

    // Bloquear si hay variantes usando algún valor de esta opción
    const inUse = await prisma.variantOptionValue.count({ where: { value: { optionId } } })
  // Explicit form to avoid ambiguity
  // const inUse = await prisma.variantOptionValue.count({ where: { value: { optionId: optionId } } })
    if (inUse > 0) return NextResponse.json({ message: 'No se puede eliminar: existen variantes que usan esta opción' }, { status: 400 })

    // Eliminar valores y luego la opción
    await prisma.productOptionValue.deleteMany({ where: { optionId } })
    await prisma.productOption.delete({ where: { id: optionId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

