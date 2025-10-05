import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ message: 'Faltan credenciales' }, { status: 400 })
    }

    // username se usa como email en este ejemplo
    const user = await prisma.user.findUnique({
      where: { email: username },
      include: { roles: { select: { name: true } } },
    })
    if (!user) {
      return NextResponse.json({ message: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ message: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    // Establecer cookie de sesión simple (para demo). En producción usar JWT/NextAuth.
    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((r: { name: string }) => r.name),
      },
    })
    res.cookies.set('session', String(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8, // 8h
    })
    return res
  } catch (err) {
    console.error('Login error', err)
    return NextResponse.json({ message: 'Error interno' }, { status: 500 })
  }
}
