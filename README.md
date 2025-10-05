# Tienda de Ropa - Next.js + Tailwind

Proyecto base en Next.js 14 con una pantalla de login moderna (usuario y contraseña) y un endpoint de autenticación simulado. Pensado para evolucionar hacia un ecommerce de moda.

## Requisitos
- Node.js 18+

## Instalación
```bash
npm install
```

## Desarrollo
```bash
npm run dev
```
Visita: http://localhost:3000

Dashboard (después de login): http://localhost:3000/dashboard

## Base de datos (Prisma + SQLite)
Se utiliza Prisma ORM con SQLite. La base de datos se guarda en `db/store.db`.

1) Crear `.env` a partir de `.env.example`:
```bash
cp .env.example .env
```

2) Instalar dependencias y generar el cliente de Prisma:
```bash
npm install
npx prisma generate
```

3) Ejecutar migraciones (creará el archivo SQLite):
```bash
npx prisma migrate dev --name init
```

4) Sembrar datos (crea usuario admin):
```bash
npm run prisma:seed
```

## Desarrollo
```bash
npm run dev
```
Visita: http://localhost:3000

## Credenciales de prueba
- Admin: `admin@tienda.com` / `admin123`
- Maintainer: `maintainer@tienda.com` / `maint123`
- Cashier: `cashier@tienda.com` / `cash123`

## Estructura
- `app/page.tsx`: Página de login.
- `components/LoginForm.tsx`: Formulario y lógica de envío.
- `app/api/login/route.ts`: Endpoint POST con validación en BD.
- `app/layout.tsx` y `app/globals.css`: Layout y estilos globales.
- `lib/prisma.ts`: Singleton de Prisma Client.
- `prisma/schema.prisma`: Esquema de la base de datos.
- `prisma/seed.mjs`: Script de seed.

## Próximos pasos sugeridos
- Conectar autenticación real (NextAuth, JWT o backend propio).
- Añadir dashboard y gestión de productos/categorías/inventario.
- Diseñar componentes UI coherentes con la identidad de marca.
