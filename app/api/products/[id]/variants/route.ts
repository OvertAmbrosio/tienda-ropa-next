import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

function buildOptionKey(items: Array<{ option: { name: string; position: number }, value: string }>) {
  const parts = items
    .sort((a, b) => (a.option.position - b.option.position) || a.option.name.localeCompare(b.option.name))
    .map((x) => `${x.option.name}:${x.value}`)
  return parts.length ? parts.join('|') : 'DEFAULT'
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    if (!Number.isFinite(productId)) return NextResponse.json({ message: 'Invalid productId' }, { status: 400 })

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { id: 'desc' },
      include: {
        values: { include: { value: { include: { option: true } } } },
      },
    })

    const items = variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      isActive: v.isActive,
      optionKey: v.optionKey,
      values: v.values.map((vv) => ({
        valueId: vv.valueId,
        optionId: vv.value.optionId,
        optionName: vv.value.option.name,
        optionPosition: vv.value.option.position,
        value: vv.value.value,
        hexColor: vv.value.hexColor,
      })),
    }))

    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    if (!Number.isFinite(productId)) return NextResponse.json({ message: 'Invalid productId' }, { status: 400 })

    const body = await req.json().catch(() => null) as { sku?: string; stock?: number; isActive?: boolean; valueIds?: number[] } | null
    const sku = String(body?.sku || `SKU-${productId}-${Date.now()}`)
    // El precio siempre es null - las variantes usan el precio del producto
    const price = null
    const stock = Number.isFinite(body?.stock) ? Math.max(0, Number(body?.stock)) : 0
    const isActive = typeof body?.isActive === 'boolean' ? body!.isActive : true
    const valueIds = Array.isArray(body?.valueIds) ? (body!.valueIds as number[]) : []

    // Validar valores y armar optionKey
    const values = await prisma.productOptionValue.findMany({
      where: { id: { in: valueIds } },
      include: { option: true },
    })
    if (values.length !== valueIds.length) return NextResponse.json({ message: 'Valores de opción inválidos' }, { status: 400 })
    if (values.some(v => v.option.productId !== productId)) return NextResponse.json({ message: 'Valores no pertenecen al producto' }, { status: 400 })

    const optionKey = buildOptionKey(values.map(v => ({ option: { name: v.option.name, position: v.option.position }, value: v.value })))

    const created = await prisma.$transaction(async (tx) => {
      // Ya no validamos contra stock del producto base
      // Cada variante puede tener su propio stock independiente
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } })
      if (!product) throw new Error('Producto no encontrado')

      const variant = await tx.productVariant.create({
        data: { productId, sku, price, stock, isActive, optionKey },
      }).catch((e: any) => {
        if (e?.code === 'P2002') return null
        throw e
      })
      if (!variant) return null

      if (valueIds.length) {
        await tx.variantOptionValue.createMany({
          data: valueIds.map((valueId) => ({ variantId: variant.id, valueId })),
          skipDuplicates: true,
        })
      }

      return variant
    })

    if (!created) return NextResponse.json({ message: 'Ya existe una variante con esa combinación' }, { status: 409 })

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (e) {
    const message = (e as any)?.message || 'Internal error'
    const status = message.includes('supera disponible') ? 400 : 500
    return NextResponse.json({ message }, { status })
  }
}
