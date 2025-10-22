import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await ensureDbReady()
  try {
    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    const row = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        imageBase64: true,
        entryDate: true,
        options: {
          orderBy: { position: 'asc' },
          select: {
            id: true, name: true, position: true,
            values: { orderBy: { id: 'asc' }, select: { id: true, value: true, hexColor: true } },
          }
        },
        variants: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
          select: {
            id: true, sku: true, price: true, stock: true, isActive: true, optionKey: true,
            values: {
              select: {
                value: { select: { id: true, value: true, hexColor: true, option: { select: { id: true, name: true, position: true } } } }
              }
            }
          }
        },
        features: { orderBy: { id: 'asc' }, select: { id: true, name: true, value: true } }
      }
    }) as any

    if (!row) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 })

    const variants = (row.variants || []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      isActive: v.isActive,
      optionKey: v.optionKey,
      values: (v.values || []).map((vv: any) => ({
        optionId: vv.value.option.id,
        optionName: vv.value.option.name,
        optionPosition: vv.value.option.position,
        valueId: vv.value.id,
        value: vv.value.value,
        hexColor: vv.value.hexColor,
      }))
    }))

    return NextResponse.json({ item: { ...row, variants } })
  } catch (e) {
    console.error('[GET /api/public/products/[id]]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
