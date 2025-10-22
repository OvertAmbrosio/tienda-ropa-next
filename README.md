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

## Base de datos (Prisma + PostgreSQL)
La app usa Prisma con PostgreSQL vía `DATABASE_URL`. Las migraciones están en `prisma/migrations/` y los datos iniciales (roles, usuarios y productos de ejemplo) se crean automáticamente al iniciar la app por primera vez mediante `ensureDbReady()`.

1) Crear `.env` a partir de `.env.example` y definir `DATABASE_URL` a tu Postgres:
```bash
cp .env.example .env
# Ejemplos de DATABASE_URL
# Local:     postgresql://user:password@localhost:5432/tienda?schema=public
# Neon/Supabase/Cloud: usar la URL provista por tu servicio
```

2) Generar Prisma Client y aplicar migraciones:
```bash
npx prisma generate --accelerate
npx prisma migrate dev --name init
```

3) Iniciar la app (bootstrap y seed automáticos en el primer request):
```bash
npm run dev
```
Abre http://localhost:3000 o realiza un POST a `/api/login` para disparar el bootstrap.

## Scripts disponibles
- `npm run dev`: inicia el servidor de desarrollo en el puerto 3000.
- `npm run build`: `prisma generate --accelerate` + `next build`.
- `npm run start`: inicia en modo producción en el puerto 3000 (requiere `build`).
- `npm run lint`: ejecuta ESLint.
- `npm run prisma:generate`: genera Prisma Client con Accelerate.
- `npm run start:prod`: genera Prisma Client, build y arranca producción en 3000.

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
  El seed inicial es automático en `lib/prisma.ts` mediante `ensureDbReady()`.

## Próximos pasos sugeridos
- Conectar autenticación real (NextAuth, JWT o backend propio).
- Añadir dashboard y gestión de productos/categorías/inventario.
- Diseñar componentes UI coherentes con la identidad de marca.

