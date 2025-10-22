import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'
import { getSessionUser, hasAnyRole } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureDbReady()
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            variants: true,
            features: true
          }
        },
        variants: {
          select: {
            stock: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 })
    }

    // Calcular stock total de variantes
    const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
    const productWithTotalStock = {
      ...product,
      stock: totalStock
    }

    return NextResponse.json({ item: productWithTotalStock })
  } catch (e) {
    console.error('Error getting product:', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureDbReady()
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    const body = await req.json()
    const { stockToAdd, name, price, imageBase64 } = body

    // Si viene stockToAdd, es una actualización de stock (DEPRECATED - no usar con el nuevo sistema)
    if (stockToAdd !== undefined) {
      return NextResponse.json({ 
        message: 'Actualización de stock no permitida en el producto base. Use el endpoint de variantes para actualizar stock.' 
      }, { status: 400 })
    }

    // Si no viene stockToAdd, es una actualización simple del producto
    const updateData: any = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (price !== undefined) {
      const priceNum = Number(price)
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return NextResponse.json({ message: 'Precio inválido' }, { status: 400 })
      }
      updateData.price = priceNum
    }
    if (imageBase64 !== undefined) {
      updateData.imageBase64 = typeof imageBase64 === 'string' ? imageBase64.trim() : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No hay datos para actualizar' }, { status: 400 })
    }

    const result = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: {
          select: {
            stock: true
          }
        }
      }
    })

    // Calcular stock total de variantes
    const totalStock = result.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
    const productWithTotalStock = {
      ...result,
      stock: totalStock
    }

    return NextResponse.json({ item: productWithTotalStock })
  } catch (e: any) {
    const message = e?.message || 'Internal error'
    return NextResponse.json({ message }, { status: message.includes('no encontrado') ? 404 : 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureDbReady()
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!hasAnyRole(user, ['ADMIN'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    // Block deletion if there are sale items linked to this product
    const saleCount = await prisma.saleItem.count({ where: { productId: id } })
    if (saleCount > 0) {
      return NextResponse.json(
        { message: 'No se puede eliminar el producto porque tiene ventas asociadas' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Delete variant option junctions for variants of this product
      await tx.variantOptionValue.deleteMany({ where: { variant: { productId: id } } })
      // Delete variants
      await tx.productVariant.deleteMany({ where: { productId: id } })
      // Delete option values (those belong to options of this product)
      await tx.productOptionValue.deleteMany({ where: { option: { productId: id } } })
      // Delete options
      await tx.productOption.deleteMany({ where: { productId: id } })
      // Delete features
      await tx.productFeature.deleteMany({ where: { productId: id } })
      // Finally delete product
      await tx.product.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    // Provide clearer Prisma error mapping if needed
    const message = e?.message || 'Internal error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
