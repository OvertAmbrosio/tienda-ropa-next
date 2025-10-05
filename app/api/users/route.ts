import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  await ensureDbReady()
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(me, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const q = (url.searchParams.get('query') || '').trim()

    const users = await prisma.user.findMany({
      where: q
        ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] }
        : {},
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, roles: { select: { name: true } } },
      take: 200,
    })
    const roles = await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    const items = (users as any[]).map((u) => ({ id: u.id, email: u.email, name: u.name, roles: (u.roles || []).map((r: any) => r.name) }))
    return NextResponse.json({ items, roles })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  await ensureDbReady()
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(me, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const email = String(body?.email ?? '').trim()
    const name = String(body?.name ?? '').trim() || null
    const password = String(body?.password ?? '').trim()
    const rolesIn: string[] = Array.isArray(body?.roles) ? body.roles.map((r: string) => String(r).toUpperCase()) : []
    if (!email || !password) return NextResponse.json({ message: 'Email y contraseña requeridos' }, { status: 400 })

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ message: 'Email ya registrado' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 10)
    const connectRoles = rolesIn.length
      ? (await prisma.role.findMany({ where: { name: { in: rolesIn } }, select: { id: true } })).map(r => ({ id: r.id }))
      : []

    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        roles: connectRoles.length ? { connect: connectRoles } : undefined,
      },
      select: { id: true, email: true, name: true, roles: { select: { name: true } } },
    })
    return NextResponse.json({ item: { id: created.id, email: created.email, name: created.name, roles: (created as any).roles.map((r: any) => r.name) } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}

