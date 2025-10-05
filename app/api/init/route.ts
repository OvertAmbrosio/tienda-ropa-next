import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function isAuthorized(request: Request) {
  const url = new URL(request.url)
  const qk = url.searchParams.get('key')
  const hk = request.headers.get('x-init-key')
  const key = process.env.INIT_KEY
  // If no INIT_KEY set, allow only in development
  if (!key) return process.env.NODE_ENV !== 'production'
  return qk === key || hk === key
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Roles
    const roleNames = ['ADMIN', 'MAINTAINER', 'CASHIER'] as const
    for (const name of roleNames) {
      await prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    }

    // Users
    const mkPass = async (p: string) => bcrypt.hash(p, 10)
    const users = [
      { email: 'admin@tienda.com', name: 'ADMIN', pass: 'admin123', roles: ['ADMIN'] },
      { email: 'maintainer@tienda.com', name: 'Maintainer', pass: 'maint123', roles: ['MAINTAINER'] },
      { email: 'cashier@tienda.com', name: 'Cashier', pass: 'cash123', roles: ['CASHIER'] },
    ] as const

    for (const u of users) {
      const exists = await prisma.user.findUnique({ where: { email: u.email } })
      if (!exists) {
        const passwordHash = await mkPass(u.pass)
        const created = await prisma.user.create({ data: { email: u.email, name: u.name, passwordHash } })
        for (const rn of u.roles) {
          const role = await prisma.role.findUnique({ where: { name: rn } })
          if (role) {
            await prisma.user.update({ where: { id: created.id }, data: { roles: { connect: { id: role.id } } } })
          }
        }
      }
    }

    // Sample products
    const countP = await prisma.product.count()
    if (countP === 0) {
      await prisma.product.createMany({
        data: [
          { name: 'Camiseta Básica', price: 39.9, stock: 25 },
          { name: 'Jeans Slim', price: 129.9, stock: 12 },
        ],
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('init error', e)
    return NextResponse.json({ message: e?.message || 'Internal error' }, { status: 500 })
  }
}
