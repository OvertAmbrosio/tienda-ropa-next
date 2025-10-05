"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import DashboardMenu from '@/components/DashboardMenu'
import ScreenLoader from '@/components/ScreenLoader'

type UserStore = { id: number; email: string; name: string | null; roles: string[] }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserStore | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('user')
    if (!raw) {
      router.replace('/')
      return
    }
    try {
      const u = JSON.parse(raw) as UserStore
      setUser(u)
    } catch {
      router.replace('/')
      return
    } finally {
      setChecking(false)
    }
  }, [router])

  if (checking) {
    return (
      <main className="min-h-screen">
        <ScreenLoader active message="Verificando acceso..." />
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-slate-400">Bienvenido {user.name ?? user.email}</p>
            <p className="text-xs text-slate-500">Roles: {user.roles.join(', ')}</p>
          </div>
          <LogoutButton />
        </header>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-medium">Menú por rol</h2>
          <DashboardMenu />
        </section>

        <section className="mt-2">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/10 to-brand-400/10 p-6">
            <h3 className="text-lg font-medium">Siguientes pasos</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li><span className="text-slate-400">Proteger rutas con sesión/JWT y autorización por roles.</span></li>
              <li><span className="text-slate-400">Crear módulos: Productos, Categorías, Inventario y Ventas.</span></li>
              <li><span className="text-slate-400">Agregar branding y navegación.</span></li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
