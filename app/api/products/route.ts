import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function GET() {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const items = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  await ensureDbReady()
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const price = Number(body?.price)
    const stock = Number(body?.stock ?? 0)
    const entryDate = body?.entryDate ? new Date(body.entryDate) : new Date()

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 })
    }

    const created = await prisma.product.create({
      data: { name, price, stock, entryDate },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
