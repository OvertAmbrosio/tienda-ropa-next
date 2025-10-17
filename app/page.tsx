"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ScreenLoader from '@/components/ScreenLoader'

type Product = { id: number; name: string; price: number; stock: number; entryDate: string }

export default function CatalogPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'new' | 'price_asc' | 'price_desc'>('new')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [total, setTotal] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<Array<{ id: number; name: string; price: number; qty: number; maxStock?: number }>>([])

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cart') : null
      if (!raw) return
      const cart = JSON.parse(raw) as Array<{ id: number; name: string; price: number; qty: number; maxStock?: number }>
      setCartItems(cart)
      setCartCount(cart.reduce((a, c) => a + (c.qty || 1), 0))
    } catch {
      // ignore
    }
  }, [])

  // Sync cart across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'cart') {
        try {
          const next = e.newValue ? (JSON.parse(e.newValue) as Array<{ id: number; name: string; price: number; qty: number }>) : []
          setCartItems(next)
          setCartCount(next.reduce((a, c) => a + (c.qty || 1), 0))
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }
  }, [])

  function addToCart(p: Product) {
    try {
      const raw = localStorage.getItem('cart')
      const cart: Array<{ id: number; name: string; price: number; qty: number; maxStock?: number }> = raw ? JSON.parse(raw) : []
      const existing = cart.find((c) => c.id === p.id)
      const currentQty = existing?.qty ?? 0
      if (currentQty >= (p.stock ?? 0)) {
        alert('No hay más stock disponible para este producto')
        return
      }
      const idx = cart.findIndex((c) => c.id === p.id)
      if (idx >= 0) {
        cart[idx].qty = Math.min(cart[idx].qty + 1, p.stock ?? cart[idx].qty)
        cart[idx].maxStock = p.stock
      } else {
        cart.push({ id: p.id, name: p.name, price: p.price, qty: 1, maxStock: p.stock })
      }
      localStorage.setItem('cart', JSON.stringify(cart))
      setCartItems(cart)
      setCartCount(cart.reduce((a, c) => a + (c.qty || 1), 0))
    } catch {
      // ignore
    }
  }

  function updateQty(id: number, delta: number) {
    setCartItems((prev) => {
      const next = prev.map((it) => {
        if (it.id !== id) return it
        const max = it.maxStock ?? Infinity
        const newQty = Math.max(1, Math.min(max, it.qty + delta))
        return { ...it, qty: newQty }
      })
      localStorage.setItem('cart', JSON.stringify(next))
      setCartCount(next.reduce((a, c) => a + (c.qty || 1), 0))
      return next
    })
  }

  function removeFromCart(id: number) {
    setCartItems((prev) => {
      const next = prev.filter((it) => it.id !== id)
      localStorage.setItem('cart', JSON.stringify(next))
      setCartCount(next.reduce((a, c) => a + (c.qty || 1), 0))
      return next
    })
  }

  const cartTotal = cartItems.reduce((sum, it) => sum + it.price * it.qty, 0)

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams()
        if (q.trim()) params.set('q', q.trim())
        if (sort) params.set('sort', sort)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        const res = await fetch(`/api/public/products?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'Error al cargar productos')
        setItems((data.items as Product[]) || [])
        setTotal(Number(data?.pagination?.total || 0))
      } catch {
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    load()
  }, [q, sort, page, pageSize])

  return (
    <main className="min-h-screen">
      {/* Floating Cart Button */}
      <button
        aria-label="Carrito"
        className="fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-100 shadow-lg backdrop-blur hover:bg-white/10"
        onClick={() => setIsCartOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l.383 1.437 1.53 5.736a2.25 2.25 0 0 0 2.177 1.699h7.51a2.25 2.25 0 0 0 2.16-1.62l1.362-4.546A1.125 1.125 0 0 0 19.066 5.25H6.553l-.28-1.05A1.875 1.875 0 0 0 3.636 2.25H2.25z"/><path d="M8.25 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9-1.5a1.5 1.5 0 1 1-3.001 0 1.5 1.5 0 0 1 3 0z"/></svg>
        <span className="text-sm">Carrito</span>
        <span className="ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-medium text-white">{cartCount}</span>
      </button>

      {/* Cart Drawer */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-slate-950/95 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tu carrito</h3>
              <button onClick={() => setIsCartOpen(false)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10">Cerrar</button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {cartItems.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-slate-300">Tu carrito está vacío.</div>
              )}
              {cartItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 pr-3">
                    <div className="truncate text-slate-100" title={it.name}>{it.name}</div>
                    <div className="text-sm text-slate-400">S/ {it.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={it.qty <= 1}
                      onClick={() => updateQty(it.id, -1)}
                      className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      -
                    </button>
                    <div className="w-8 text-center text-slate-100">{it.qty}</div>
                    <button
                      disabled={(it.maxStock ?? Infinity) <= it.qty}
                      onClick={() => updateQty(it.id, 1)}
                      className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      +
                    </button>
                    <button onClick={() => removeFromCart(it.id)} className="ml-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-rose-100 hover:bg-rose-500/20">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="mb-3 flex items-center justify-between text-slate-200">
                <span>Total</span>
                <span className="text-lg font-semibold">S/ {cartTotal.toFixed(2)}</span>
              </div>
              <button
                disabled={cartItems.length === 0}
                onClick={() => {
                  setIsCartOpen(false)
                  if (typeof window !== 'undefined') window.location.href = '/checkout'
                }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white shadow-glow hover:bg-emerald-500 disabled:opacity-60"
              >
                Pagar
              </button>
            </div>
          </aside>
        </>
      )}
      <section className="relative h-72 w-full overflow-hidden">
        <img src="/store-banner-fashion.svg" alt="RUSARFI" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-semibold text-white drop-shadow">RUSARFI</h1>
          <p className="mt-1 max-w-2xl text-slate-200">Catálogo de ropa para todos los estilos.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Productos</h2>
            <p className="mt-1 text-sm text-slate-400">Encuentra tus prendas favoritas.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              placeholder="Buscar productos..."
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value) }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4 sm:w-64"
            />
            <select
              value={sort}
              onChange={(e) => { setPage(1); setSort(e.target.value as any) }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
            >
              <option value="new">Novedades</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
            <Link href="/admin" className="text-sm text-slate-300 underline underline-offset-4 hover:text-white">Panel Administrativo</Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-800">
                <img
                  src="/placeholder-product.svg"
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02] select-none"
                  draggable={false}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement
                    // fallback a imagen del hero si el placeholder no existe
                    target.src = '/hero-fashion.jpg'
                  }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="truncate pr-2 text-slate-100" title={p.name}>{p.name}</div>
                <div className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-sm text-emerald-200">S/ {p.price.toFixed(2)}</div>
              </div>
              <div className="mt-3">
                <button
                  disabled={(p.stock ?? 0) <= 0}
                  onClick={() => addToCart(p)}
                  className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow hover:bg-brand-500 disabled:opacity-50"
                >
                  Comprar
                </button>
              </div>
            </div>
          ))}
          {!loading && items.length === 0 && (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">No hay productos disponibles.</div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm text-slate-400">
            Mostrando {items.length} de {total} productos
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="min-w-[5rem] text-center text-sm text-slate-300">Página {page}</div>
            <button
              disabled={loading || page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando catálogo..." />
    </main>
  )
}
