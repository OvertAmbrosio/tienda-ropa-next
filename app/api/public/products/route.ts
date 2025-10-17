import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

export async function GET(request: Request) {
  await ensureDbReady()
  try {
    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()
    const sort = (searchParams.get('sort') || 'new').toLowerCase() // 'new' | 'price_asc' | 'price_desc'
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(48, Math.max(1, Number(searchParams.get('pageSize') || '12')))

    const where: any = {
      stock: { gt: 0 },
    }
    if (q) {
      where.name = { contains: q, mode: 'insensitive' }
    }

    const orderBy: any =
      sort === 'price_asc' ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
      { createdAt: 'desc' }

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, price: true, stock: true, entryDate: true },
      }),
    ])

    return NextResponse.json({ items, pagination: { page, pageSize, total } })
  } catch (e) {
    console.error('Public products error', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
