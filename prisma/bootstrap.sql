-- One-time schema bootstrap for Postgres (run with your direct postgresql:// connection)
-- Creates the tables expected by the current Prisma schema

CREATE TABLE IF NOT EXISTS "User" (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Role" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "Product" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  "entryDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Customer" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Sale" (
  id SERIAL PRIMARY KEY,
  "customerName" TEXT,
  "customerId" INTEGER,
  "saleDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  total DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sale_customer FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "SaleItem" (
  id SERIAL PRIMARY KEY,
  "saleId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "lineTotal" DOUBLE PRECISION NOT NULL,
  CONSTRAINT fk_saleitem_sale FOREIGN KEY ("saleId") REFERENCES "Sale"(id) ON DELETE CASCADE,
  CONSTRAINT fk_saleitem_product FOREIGN KEY ("productId") REFERENCES "Product"(id) ON DELETE RESTRICT
);

-- Implicit many-to-many between Role and User
CREATE TABLE IF NOT EXISTS "_RoleToUser" (
  "A" INTEGER NOT NULL,
  "B" INTEGER NOT NULL,
  CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B"),
  CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "_RoleToUser_B_index" ON "_RoleToUser"("B");
