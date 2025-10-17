import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

type OrderItem = { id: number; qty: number }
type OrderRequest = {
  customer: { name: string; email?: string; address?: string }
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

    const productIds = [...new Set(body.items.map(it => Number(it.id)).filter(Number.isInteger))]
    if (productIds.length === 0) {
      return NextResponse.json({ message: 'No hay productos válidos' }, { status: 400 })
    }

    const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } })
    if (dbProducts.length !== productIds.length) {
      return NextResponse.json({ message: 'Uno o más productos no existen' }, { status: 400 })
    }

    // Validate stock and compute line items
    const lines = body.items.map(it => {
      const product = dbProducts.find(p => p.id === it.id)
      if (!product) throw new Error(`Producto ${it.id} no encontrado`)
      
      const qty = Math.max(1, Math.floor(Number(it.qty)))
      if (qty > product.stock) {
        throw new Error(`Stock insuficiente para ${product.name} (disponible: ${product.stock}, solicitado: ${qty})`)
      }
      
      return {
        productId: product.id,
        qty,
        unitPrice: product.price,
        lineTotal: product.price * qty,
      }
    })

    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0)

    // Transaction: create/update customer, create sale, items, decrement stock
    const result = await prisma.$transaction(async (tx) => {
      // Upsert customer with contact info
      const customer = await tx.customer.upsert({
        where: { name },
        update: { email, address },
        create: { name, email, address },
      })

      // Create sale (status defaults to PENDING for web orders)
      const sale = await tx.sale.create({
        data: {
          customerName: name,
          customerId: customer.id,
          total,
          status: 'PENDING', // Orden web en estado pendiente
          source: 'WEB', // Venta creada desde la web
        },
      })

      // Process each line item
      for (const line of lines) {
        // Re-check stock inside transaction to avoid race conditions
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

        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: line.productId,
            quantity: line.qty,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          },
        })

        // Decrement stock
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.qty } },
        })
      }

      return { saleId: sale.id, customerId: customer.id }
    })

    return NextResponse.json({
      orderId: result.saleId,
      customerId: result.customerId,
      status: 'PENDING',
      total,
    })
  } catch (error: any) {
    const message = error?.message || 'Error al procesar la orden'
    console.error('[POST /api/public/orders] Error:', message)
    return NextResponse.json({ message }, { status: 400 })
  }
}
