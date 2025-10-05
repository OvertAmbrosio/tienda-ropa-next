import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const q = (url.searchParams.get('query') || '').trim()
    // SQLite suele ser case-insensitive por defecto; evitamos 'mode: "insensitive"' para compatibilidad
    const where = q ? { name: { contains: q } } : {}
    const take = q ? 10 : 50
    const items = await prisma.customer.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      take,
      select: { id: true, name: true },
    })

    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    if (!name) return NextResponse.json({ message: 'Nombre requerido' }, { status: 400 })

    const existing = await prisma.customer.findFirst({ where: { name }, select: { id: true, name: true } })
    if (existing) return NextResponse.json({ item: existing }, { status: 200 })

    const created = await prisma.customer.create({ data: { name } })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
