"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type UserStore = {
  id: number
  email: string
  name: string | null
  roles: string[]
}

const ALL_ITEMS = {
  products: { label: 'Gestión de productos', href: '/products' },
  sales: { label: 'Gestión de ventas', href: '/sales' },
  customers: { label: 'Gestión de clientes', href: '/customers' },
  users: { label: 'Administración de usuarios', href: '/users' },
}

export default function DashboardMenu() {
  const [user, setUser] = useState<UserStore | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch {}
    }
  }, [])

  const items = useMemo(() => {
    const set = new Map<string, { label: string; href: string }>()
    const roles = user?.roles || []
    if (roles.includes('ADMIN')) {
      set.set('products', ALL_ITEMS.products)
      set.set('sales', ALL_ITEMS.sales)
      set.set('customers', ALL_ITEMS.customers)
      set.set('users', ALL_ITEMS.users)
    }
    if (roles.includes('MAINTAINER')) {
      set.set('products', ALL_ITEMS.products)
    }
    if (roles.includes('CASHIER')) {
      set.set('sales', ALL_ITEMS.sales)
    }
    return Array.from(set.values())
  }, [user])

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No hay opciones disponibles para tu rol.
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="group rounded-xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10 transition-colors hover:bg-white/10"
        >
          <div className="text-base font-medium text-slate-100">{it.label}</div>
          <div className="mt-1 text-xs text-slate-400">{it.href}</div>
        </Link>
      ))}
    </div>
  )
}
