import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

function buildOptionKey(items: Array<{ option: { name: string; position: number }, value: string }>) {
  const parts = items
    .sort((a, b) => (a.option.position - b.option.position) || a.option.name.localeCompare(b.option.name))
    .map((x) => `${x.option.name}:${x.value}`)
  return parts.length ? parts.join('|') : 'DEFAULT'
}

export async function PATCH(req: Request, { params }: { params: { id: string; variantId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    const variantId = Number(params.variantId)
    if (!Number.isFinite(productId) || !Number.isFinite(variantId)) return NextResponse.json({ message: 'Invalid ids' }, { status: 400 })

    const body = await req.json().catch(() => null) as { sku?: string; stock?: number; isActive?: boolean; valueIds?: number[] } | null
    const patch: any = {}
    if (typeof body?.sku === 'string') patch.sku = body.sku.trim()
    // El precio siempre es null - las variantes usan el precio del producto
    patch.price = null
    if (Number.isFinite(body?.stock)) patch.stock = Math.max(0, Number(body?.stock))
    if (typeof body?.isActive === 'boolean') patch.isActive = body.isActive

    const valueIds = Array.isArray(body?.valueIds) ? (body!.valueIds as number[]) : null

    const updated = await prisma.$transaction(async (tx) => {
      let optionKey: string | undefined
      if (valueIds) {
        const values = await tx.productOptionValue.findMany({
          where: { id: { in: valueIds } },
          include: { option: true },
        })
        if (values.length !== valueIds.length) throw new Error('Valores de opción inválidos')
        if (values.some(v => v.option.productId !== productId)) throw new Error('Valores no pertenecen al producto')
        optionKey = buildOptionKey(values.map(v => ({ option: { name: v.option.name, position: v.option.position }, value: v.value })))
      }

      const v = await tx.productVariant.update({
        where: { id: variantId },
        data: { ...patch, ...(optionKey ? { optionKey } : {}) },
      }).catch((e: any) => {
        if (e?.code === 'P2002') return null
        throw e
      })
      if (!v) return null

      if (valueIds) {
        await tx.variantOptionValue.deleteMany({ where: { variantId } })
        if (valueIds.length) {
          await tx.variantOptionValue.createMany({
            data: valueIds.map((valueId) => ({ variantId, valueId })),
            skipDuplicates: true,
          })
        }
      }

      return v
    })

    if (!updated) return NextResponse.json({ message: 'No se pudo actualizar (combinación duplicada o no existe)' }, { status: 409 })

    return NextResponse.json({ item: updated })
  } catch (e: any) {
    const message = e?.message || 'Internal error'
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; variantId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN', 'MAINTAINER'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const productId = Number(params.id)
    const variantId = Number(params.variantId)
    if (!Number.isFinite(productId) || !Number.isFinite(variantId)) return NextResponse.json({ message: 'Invalid ids' }, { status: 400 })

    const inUse = await prisma.saleItem.count({ where: { variantId } })
    if (inUse > 0) return NextResponse.json({ message: 'No se puede eliminar: existen ventas asociadas a esta variante' }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) throw new Error('Variante no encontrada')

      // If it's not DEFAULT, restore its stock to DEFAULT pool if available
      if (variant.optionKey !== 'DEFAULT' && variant.stock > 0) {
        const def = await tx.productVariant.findFirst({ where: { productId, optionKey: 'DEFAULT' } })
        if (def) {
          await tx.productVariant.update({ where: { id: def.id }, data: { stock: { increment: variant.stock } } })
        }
        // else: no DEFAULT pool, do not adjust product.stock to avoid double counting
      }

      await tx.variantOptionValue.deleteMany({ where: { variantId } })
      await tx.productVariant.delete({ where: { id: variantId } })
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    const message = e?.message || 'Internal error'
    return NextResponse.json({ message }, { status: message.includes('no encontrada') ? 404 : 500 })
  }
}

