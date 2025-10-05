import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Id inválido' }, { status: 400 })

    const body = await request.json()
    const email = body?.email !== undefined ? String(body.email).trim() : undefined
    const name = body?.name !== undefined ? (String(body.name).trim() || null) : undefined
    const password = body?.password ? String(body.password).trim() : undefined
    const rolesIn: string[] | undefined = Array.isArray(body?.roles)
      ? body.roles.map((r: string) => String(r).toUpperCase())
      : undefined

    const data: any = {}
    if (email !== undefined) data.email = email
    if (name !== undefined) data.name = name
    if (password) data.passwordHash = await bcrypt.hash(password, 10)

    if (rolesIn) {
      const roleRows = rolesIn.length
        ? await prisma.role.findMany({ where: { name: { in: rolesIn } }, select: { id: true } })
        : []
      data.roles = { set: roleRows.map((r) => ({ id: r.id })) }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, roles: { select: { name: true } } },
    })

    return NextResponse.json({ item: { ...updated, roles: updated.roles.map((r) => r.name) } })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Id inválido' }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}
