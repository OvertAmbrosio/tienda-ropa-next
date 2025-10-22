import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string; featureId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const featureId = Number(params.featureId)
    if (!Number.isFinite(featureId)) return NextResponse.json({ message: 'Invalid featureId' }, { status: 400 })

    const body = await req.json().catch(() => null) as { name?: string; value?: string } | null
    const data: any = {}
    if (typeof body?.name === 'string') data.name = body.name.trim()
    if (typeof body?.value === 'string') data.value = body.value.trim()

    if (Object.keys(data).length === 0) return NextResponse.json({ message: 'No hay cambios' }, { status: 400 })

    const updated = await prisma.productFeature.update({ where: { id: featureId }, data })
    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; featureId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const featureId = Number(params.featureId)
    if (!Number.isFinite(featureId)) return NextResponse.json({ message: 'Invalid featureId' }, { status: 400 })

    await prisma.productFeature.delete({ where: { id: featureId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

