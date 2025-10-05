import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Ensure roles exist
  const roleNames = ['ADMIN', 'MAINTAINER', 'CASHIER']
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  // Ensure admin user exists and has ADMIN role
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tienda.com' },
    update: {},
    create: {
      email: 'admin@tienda.com',
      name: 'Admin',
      passwordHash,
    },
    include: { roles: true },
  })

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  if (adminRole) {
    const hasAdmin = admin.roles.some((r) => r.id === adminRole.id)
    if (!hasAdmin) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { roles: { connect: { id: adminRole.id } } },
      })
    }
  }

  // Ensure maintainer user exists and has MAINTAINER role
  const maintPass = await bcrypt.hash('maint123', 10)
  const maint = await prisma.user.upsert({
    where: { email: 'maintainer@tienda.com' },
    update: {},
    create: {
      email: 'maintainer@tienda.com',
      name: 'Maintainer',
      passwordHash: maintPass,
    },
    include: { roles: true },
  })
  const maintRole = await prisma.role.findUnique({ where: { name: 'MAINTAINER' } })
  if (maintRole) {
    const has = maint.roles.some((r) => r.id === maintRole.id)
    if (!has) {
      await prisma.user.update({ where: { id: maint.id }, data: { roles: { connect: { id: maintRole.id } } } })
    }
  }

  // Ensure cashier user exists and has CASHIER role
  const cashPass = await bcrypt.hash('cash123', 10)
  const cash = await prisma.user.upsert({
    where: { email: 'cashier@tienda.com' },
    update: {},
    create: {
      email: 'cashier@tienda.com',
      name: 'Cashier',
      passwordHash: cashPass,
    },
    include: { roles: true },
  })
  const cashRole = await prisma.role.findUnique({ where: { name: 'CASHIER' } })
  if (cashRole) {
    const has = cash.roles.some((r) => r.id === cashRole.id)
    if (!has) {
      await prisma.user.update({ where: { id: cash.id }, data: { roles: { connect: { id: cashRole.id } } } })
    }
  }

  // Seed products if none
  const productCount = await prisma.product.count()
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        { name: 'Camiseta Básica', price: 39.9, stock: 25, entryDate: new Date() },
        { name: 'Jeans Slim', price: 129.9, stock: 12, entryDate: new Date() },
      ],
    })
  }

  console.log('Seed completado: roles y usuarios de ejemplo; productos de muestra creados')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
