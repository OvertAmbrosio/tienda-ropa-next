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

    const nameFilter: any = q ? { name: { contains: q, mode: 'insensitive' } } : {}
    // Disponibilidad: variantes activas con stock > 0, o compatibilidad con productos antiguos con stock > 0
    const availability = {
      OR: [
        { variants: { some: { isActive: true, stock: { gt: 0 } } } },
        { stock: { gt: 0 } },
      ],
    }
    const where: any = { AND: [nameFilter, availability] }

    const orderBy: any =
      sort === 'price_asc' ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
      { createdAt: 'desc' }

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true, // fallback para productos antiguos
          entryDate: true,
          imageBase64: true,
          variants: {
            where: { isActive: true },
            select: { stock: true },
          },
        },
      }),
    ])

    const items = rows.map((r: any) => {
      const list: Array<{ stock: number }> = Array.isArray(r?.variants) ? r.variants : []
      const variantStock = list.reduce((s: number, v: { stock: number }) => s + (v?.stock ?? 0), 0)
      const totalStock = variantStock > 0 ? variantStock : (r.stock || 0)
      const hasVariants = list.length > 0
      return {
        id: r.id,
        name: r.name,
        price: r.price,
        stock: totalStock,
        entryDate: r.entryDate,
        imageBase64: (r as any).imageBase64 ?? null,
        hasVariants,
      }
    })

    return NextResponse.json({ items, pagination: { page, pageSize, total } })
  } catch (e) {
    console.error('Public products error', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
