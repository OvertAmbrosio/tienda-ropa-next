import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import bcrypt from 'bcryptjs'
// Explicitly pass the Accelerate URL so the client doesn't fallback to a non-accelerate URL
export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate())

// ------- Bootstrap helpers -------
function getDefaultSchemaFromUrl(): string {
  const url = process.env.DATABASE_URL || ''
  const m = url.match(/[?&]schema=([^&]+)/i)
  const raw = m ? decodeURIComponent(m[1]) : 'public'
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(raw) ? raw : 'public'
}

function qi(id: string) {
  return '"' + id.replace(/[^A-Za-z0-9_]/g, '') + '"'
}

async function tablesExist(): Promise<boolean> {
  const schema = getDefaultSchemaFromUrl()
  try {
    const res = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'User'
       ) as exists`,
      schema as any,
    )
    return !!(res && res[0] && res[0].exists === true)
  } catch {
    return false
  }
}

async function ensureSchemaDDL(): Promise<void> {
  const schema = getDefaultSchemaFromUrl()
  if (schema === 'public') return // avoid DDL on public (usually no perms)
  const S = qi(schema)
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${S};`)
  } catch {}

  const ddls: string[] = [
    `CREATE TABLE IF NOT EXISTS ${S}."User" (
       id SERIAL PRIMARY KEY,
       email TEXT NOT NULL UNIQUE,
       name TEXT,
       "passwordHash" TEXT NOT NULL,
       "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
     );`,
    `CREATE TABLE IF NOT EXISTS ${S}."Role" (
       id SERIAL PRIMARY KEY,
       name TEXT NOT NULL UNIQUE
     );`,
    `CREATE TABLE IF NOT EXISTS ${S}."Product" (
       id SERIAL PRIMARY KEY,
       name TEXT NOT NULL,
       price DOUBLE PRECISION NOT NULL,
       stock INTEGER NOT NULL DEFAULT 0,
       "entryDate" TIMESTAMP NOT NULL DEFAULT NOW(),
       "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
       "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
     );`,
    `CREATE TABLE IF NOT EXISTS ${S}."Customer" (
       id SERIAL PRIMARY KEY,
       name TEXT NOT NULL UNIQUE,
       "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
     );`,
    `CREATE TABLE IF NOT EXISTS ${S}."Sale" (
       id SERIAL PRIMARY KEY,
       "customerName" TEXT,
       "customerId" INTEGER,
       "saleDate" TIMESTAMP NOT NULL DEFAULT NOW(),
       total DOUBLE PRECISION NOT NULL DEFAULT 0,
       "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
       CONSTRAINT fk_sale_customer FOREIGN KEY ("customerId") REFERENCES ${S}."Customer"(id) ON DELETE SET NULL
     );`,
    `CREATE TABLE IF NOT EXISTS ${S}."SaleItem" (
       id SERIAL PRIMARY KEY,
       "saleId" INTEGER NOT NULL,
       "productId" INTEGER NOT NULL,
       quantity INTEGER NOT NULL,
       "unitPrice" DOUBLE PRECISION NOT NULL,
       "lineTotal" DOUBLE PRECISION NOT NULL,
       CONSTRAINT fk_saleitem_sale FOREIGN KEY ("saleId") REFERENCES ${S}."Sale"(id) ON DELETE CASCADE,
       CONSTRAINT fk_saleitem_product FOREIGN KEY ("productId") REFERENCES ${S}."Product"(id) ON DELETE RESTRICT
     );`,
    `CREATE TABLE IF NOT EXISTS ${S}."_RoleToUser" (
       "A" INTEGER NOT NULL,
       "B" INTEGER NOT NULL,
       CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B"),
       CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES ${S}."Role"(id) ON DELETE CASCADE ON UPDATE CASCADE,
       CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES ${S}."User"(id) ON DELETE CASCADE ON UPDATE CASCADE
     );`,
    `CREATE INDEX IF NOT EXISTS "_RoleToUser_B_index" ON ${S}."_RoleToUser"("B");`,
  ]

  for (const sql of ddls) {
    try { await prisma.$executeRawUnsafe(sql) } catch {}
  }
}

async function ensureSeed(): Promise<void> {
  const hasTables = await tablesExist()
  if (!hasTables) return

  const schema = getDefaultSchemaFromUrl()
  const S = qi(schema)

  // Roles
  const roles = ['ADMIN', 'MAINTAINER', 'CASHIER']
  for (const r of roles) {
    try {
      await prisma.$executeRawUnsafe(`INSERT INTO ${S}."Role" (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`, r as any)
    } catch {}
  }

  // Users (only if not present)
  const users = [
    { email: 'admin@tienda.com', name: 'ADMIN', pass: 'admin123', roles: ['ADMIN'] },
    { email: 'maintainer@tienda.com', name: 'Maintainer', pass: 'maint123', roles: ['MAINTAINER'] },
    { email: 'cashier@tienda.com', name: 'Cashier', pass: 'cash123', roles: ['CASHIER'] },
  ] as const

  for (const u of users) {
    const found = await prisma.user.findUnique({ where: { email: u.email } }).catch(() => null)
    if (!found) {
      const passwordHash = await bcrypt.hash(u.pass, 10)
      const created = await prisma.user.create({ data: { email: u.email, name: u.name, passwordHash } }).catch(() => null)
      if (!created) continue
      for (const rn of u.roles) {
        const role = await prisma.role.findUnique({ where: { name: rn } }).catch(() => null)
        if (role) {
          try {
            await prisma.$executeRawUnsafe(
              `INSERT INTO ${S}."_RoleToUser" ("A","B") VALUES ($1,$2) ON CONFLICT DO NOTHING;`,
              role.id as any,
              created.id as any,
            )
          } catch {}
        }
      }
    }
  }

  // Sample products
  const pCount = await prisma.product.count().catch(() => 0)
  if (pCount === 0) {
    try {
      await prisma.product.createMany({
        data: [
          { name: 'Camiseta Básica', price: 39.9, stock: 25 },
          { name: 'Jeans Slim', price: 129.9, stock: 12 },
        ],
      })
    } catch {}
  }
}

async function bootstrap() {
  try {
    await ensureSchemaDDL()
    await ensureSeed()
  } catch {}
}

if (!(globalThis as any).__bootstrapPromise) {
  ;(globalThis as any).__bootstrapPromise = bootstrap()
}

export async function ensureDbReady() {
  await (globalThis as any).__bootstrapPromise
  return
}
