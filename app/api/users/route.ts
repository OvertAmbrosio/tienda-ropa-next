import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const q = (url.searchParams.get('query') || '').trim()

    const items = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, roles: { select: { name: true } } },
      take: 200,
    })

    const roles = await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })

    return NextResponse.json({ items: items.map(u => ({ ...u, roles: u.roles.map(r => r.name) })), roles })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const email = String(body?.email ?? '').trim()
    const name = String(body?.name ?? '').trim() || null
    const password = String(body?.password ?? '').trim()
    const rolesIn: string[] = Array.isArray(body?.roles) ? body.roles.map((r: string) => String(r).toUpperCase()) : []

    if (!email || !password) return NextResponse.json({ message: 'Email y contraseña requeridos' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ message: 'Email ya registrado' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 10)

    const roleRows = rolesIn.length ? await prisma.role.findMany({ where: { name: { in: rolesIn } }, select: { id: true } }) : []

    const created = await prisma.user.create({
      data: {
        email, name, passwordHash,
        roles: roleRows.length ? { connect: roleRows.map(r => ({ id: r.id })) } : undefined,
      },
      select: { id: true, email: true, name: true, roles: { select: { name: true } } },
    })

    return NextResponse.json({ item: { ...created, roles: created.roles.map(r => r.name) } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}
