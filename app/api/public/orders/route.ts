import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

type OrderItem = { id?: number; productId?: number; variantId?: number; qty: number }
type OrderRequest = {
  customer: { name: string; email?: string; address?: string; phone?: string; documentNumber?: string }
  items: OrderItem[]
}

export async function POST(req: Request) {
  await ensureDbReady()
  try {
    const body = await req.json().catch(() => null) as OrderRequest | null
    if (!body?.customer?.name || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ message: 'Datos inválidos: se requiere nombre de cliente e items' }, { status: 400 })
    }

    const name = body.customer.name.trim()
    const email = body.customer.email?.trim() || null
    const address = body.customer.address?.trim() || null
    const phone = body.customer.phone?.trim() || null
    const documentNumber = body.customer.documentNumber?.trim() || null

    const rawItems: OrderItem[] = Array.isArray(body.items) ? body.items : []
    const productItems = rawItems.filter((it) => !it.variantId && Number.isFinite(Number(it.productId ?? it.id)))
    const variantItems = rawItems.filter((it) => Number.isFinite(Number(it.variantId)))

    const productIds = [...new Set(productItems.map((it) => Number(it.productId ?? it.id)))]
    const variantIds = [...new Set(variantItems.map((it) => Number(it.variantId)))]

    if (productIds.length === 0 && variantIds.length === 0) {
      return NextResponse.json({ message: 'No hay items válidos' }, { status: 400 })
    }

    const dbProducts = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : []
    if (productIds.length && dbProducts.length !== productIds.length) {
      return NextResponse.json({ message: 'Uno o más productos no existen' }, { status: 400 })
    }

    const dbVariants = variantIds.length
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: { product: { select: { id: true, name: true, price: true, stock: true } } },
        })
      : []
    if (variantIds.length && dbVariants.length !== variantIds.length) {
      return NextResponse.json({ message: 'Una o más variantes no existen' }, { status: 400 })
    }

    // Validate stock and compute line items (mixed: product-only or variant-based)
    const lines = [
      ...productItems.map((it) => {
        const productId = Number(it.productId ?? it.id)
        const product = dbProducts.find((p) => p.id === productId)
        if (!product) throw new Error(`Producto ${productId} no encontrado`)

        const qty = Math.max(1, Math.floor(Number(it.qty)))
        if (qty > product.stock) {
          throw new Error(`Stock insuficiente para ${product.name} (disponible: ${product.stock}, solicitado: ${qty})`)
        }

        return {
          productId: product.id,
          variantId: null as number | null,
          qty,
          unitPrice: product.price,
          lineTotal: product.price * qty,
        }
      }),
      ...variantItems.map((it) => {
        const variantId = Number(it.variantId)
        const variant = dbVariants.find((v) => v.id === variantId) as any
        if (!variant) throw new Error(`Variante ${variantId} no encontrada`)
        if (!variant.isActive) throw new Error(`Variante ${variantId} inactiva`)

        const qty = Math.max(1, Math.floor(Number(it.qty)))
        if (qty > variant.stock) {
          throw new Error(`Stock insuficiente para ${variant.product.name} (${variant.optionKey || 'variante'}) (disponible: ${variant.stock}, solicitado: ${qty})`)
        }

        const unitPrice = (variant.price ?? variant.product.price) as number
        return {
          productId: variant.productId as number,
          variantId: variant.id as number,
          qty,
          unitPrice,
          lineTotal: unitPrice * qty,
        }
      }),
    ]

    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0)

    // Transaction: create/update customer, create sale, items, decrement stock
    function genTracking() {
      const base = 'RS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
      return base
    }

    let trackingCode = genTracking()
    for (let i = 0; i < 5; i++) {
      const exists = await (prisma as any).sale.findFirst({ where: { trackingCode } })
      if (!exists) break
      trackingCode = genTracking()
    }

    const result = await prisma.$transaction(async (tx) => {
      // Upsert customer with contact info
      const customer = await tx.customer.upsert({
        where: { name },
        update: { email, address, phone, documentNumber },
        create: { name, email, address, phone, documentNumber },
      })

      // Create sale (status defaults to PENDING for web orders)
      const sale = await tx.sale.create({
        data: ({
          customerName: name,
          customerId: customer.id,
          total,
          status: 'PENDING', // Orden web en estado pendiente
          source: 'WEB', // Venta creada desde la web
          trackingCode,
        } as any),
      })

      // Process each line item
      for (const line of lines) {
        if (line.variantId) {
          // Re-check variant stock inside transaction
          const variant = await tx.productVariant.findUnique({
            where: { id: line.variantId },
            include: { product: { select: { id: true, name: true, stock: true } } },
          }) as any

          if (!variant) throw new Error(`Variante ${line.variantId} no encontrada durante confirmación`)
          if (!variant.isActive) throw new Error(`Variante ${line.variantId} inactiva`)
          if (line.qty > variant.stock) {
            throw new Error(`Stock insuficiente para ${variant.product.name} (variante) (disponible: ${variant.stock})`)
          }

          // Create sale item with variant
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: variant.productId,
              variantId: variant.id,
              quantity: line.qty,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            },
          })

          // Decrement variant stock
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: line.qty } },
          })

          // Optionally decrement product stock for compatibility, capping at zero
          const dec = Math.min(line.qty, variant.product.stock)
          if (dec > 0) {
            await tx.product.update({
              where: { id: variant.productId },
              data: { stock: { decrement: dec } },
            })
          }
        } else {
          // Re-check product stock inside transaction to avoid race conditions
          const product = await tx.product.findUnique({
            where: { id: line.productId },
            select: { id: true, name: true, stock: true },
          })
          
          if (!product) {
            throw new Error(`Producto ${line.productId} no encontrado durante confirmación`)
          }
          if (line.qty > product.stock) {
            throw new Error(`Stock insuficiente para ${product.name} (disponible: ${product.stock})`)
          }

          // Create sale item (product only)
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: line.productId,
              quantity: line.qty,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            },
          })

          // Decrement product stock
          await tx.product.update({
            where: { id: line.productId },
            data: { stock: { decrement: line.qty } },
          })
        }
      }

      // Registrar historial inicial
      await tx.saleHistory.create({
        data: {
          saleId: sale.id,
          previousStatus: null,
          newStatus: 'PENDING' as any,
          comment: 'Orden creada en web',
          performedBy: 'Cliente',
        },
      })

      return { saleId: sale.id, customerId: customer.id, trackingCode: (sale as any).trackingCode }
    })

    return NextResponse.json({
      orderId: result.saleId,
      customerId: result.customerId,
      status: 'PENDING',
      total,
      trackingCode: result.trackingCode,
    })
  } catch (error: any) {
    const message = error?.message || 'Error al procesar la orden'
    console.error('[POST /api/public/orders] Error:', message)
    return NextResponse.json({ message }, { status: 400 })
  }
}
