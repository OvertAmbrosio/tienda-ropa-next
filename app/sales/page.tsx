"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { runUiAction } from '@/lib/ui-action'
import ScreenLoader from '@/components/ScreenLoader'
import Link from 'next/link'

type Product = { id: number; name: string; price: number; stock: number }

type SaleItem = { id: number; product: { id: number; name: string; price: number }; quantity: number; unitPrice: number; lineTotal: number }
type Sale = { id: number; customerName: string | null; saleDate: string; total: number; createdAt: string; items: SaleItem[] }
type SalesListResponse = { items: Sale[] }

type NewItem = { productId: number | ''; quantity: number }

function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sales, setSales] = useState<Sale[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerOpts, setCustomerOpts] = useState<Array<{ id: number; name: string }>>([])
  const [showCustomerOpts, setShowCustomerOpts] = useState(false)
  const [saleDate, setSaleDate] = useState(todayISO())
  const [items, setItems] = useState<NewItem[]>([{ productId: '', quantity: 1 }])

  const canSubmit = useMemo(() => {
    if (!items.length) return false
    return items.every((it) => Number.isFinite(it.productId) && it.quantity > 0)
  }, [items])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const total = useMemo(() => {
    return items.reduce((acc, it) => {
      if (!Number.isFinite(it.productId as number)) return acc
      const p = productById.get(it.productId as number)
      if (!p) return acc
      return acc + p.price * it.quantity
    }, 0)
  }, [items, productById])

  async function loadProducts() {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Error al cargar productos')
      setProducts(data.items)
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar productos')
    }
  }

  async function loadSalesFor(date: string) {
    try {
      const res = await fetch(`/api/sales?date=${date}`, { cache: 'no-store' })
      const data = (await res.json()) as SalesListResponse
      if (!res.ok) throw new Error((data as any)?.message || 'Error al cargar ventas')
      setSales(data.items)
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar ventas')
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProducts(), loadSalesFor(saleDate)]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // recargar historial cuando cambie la fecha seleccionada
    loadSalesFor(saleDate)
  }, [saleDate])

  const addRow = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }])
  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  // Debounced customer search
  useEffect(() => {
    const q = customerName.trim()
    if (q.length < 2) {
      setCustomerOpts([])
      setShowCustomerOpts(false)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?query=${encodeURIComponent(q)}`, { cache: 'no-store' })
        const data = await res.json()
        if (res.ok) {
          setCustomerOpts(data.items ?? [])
          setShowCustomerOpts((data.items ?? []).length > 0)
        }
      } catch {
        // ignore
      }
    }, 250)
    return () => clearTimeout(t)
  }, [customerName])

  const onCreate = async () => {
    const payload = {
      customerName: customerName.trim() || null,
      saleDate,
      items: items
        .filter((it) => Number.isFinite(it.productId as number))
        .map((it) => ({ productId: Number(it.productId), quantity: it.quantity })),
    }

    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'No se pudo registrar la venta')
        return data.item as Sale
      },
      successMessage: 'Venta registrada',
      onSuccess: async () => {
        setCustomerName('')
        setItems([{ productId: '', quantity: 1 }])
        await Promise.all([loadProducts(), loadSalesFor(saleDate)])
      },
    })
  }

  const totalDay = useMemo(() => sales.reduce((acc, s) => acc + s.total, 0), [sales])

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gestión de Ventas</h1>
          <Link href="/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Volver al dashboard</Link>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Cliente</label>
              <div className="relative">
                <input
                  placeholder="Nombre del cliente (opcional)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onFocus={() => setShowCustomerOpts(customerOpts.length > 0)}
                  onBlur={() => setTimeout(() => setShowCustomerOpts(false), 120)}
                />
                {showCustomerOpts && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur">
                    {customerOpts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCustomerName(c.name)
                          setShowCustomerOpts(false)
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-white/10"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Fecha de la venta</label>
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-emerald-200">
                Total actual: <span className="font-semibold">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {items.map((row, idx) => {
              const p = Number.isFinite(row.productId as number) ? productById.get(row.productId as number) : undefined
              const warnNoStock = p && p.stock <= 0
              const warnQty = p && row.quantity > p.stock
              return (
                <div key={idx} className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-6">
                    <label className="mb-2 block text-sm text-slate-300">Producto</label>
                    <select
                      className="select-dark w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                      value={row.productId as any}
                      onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, productId: (e.target.value ? Number(e.target.value) : '') as any } : r))}
                    >
                      <option value="">Seleccione producto</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id} disabled={prod.stock <= 0}>
                          {prod.name} — S/ {prod.price.toFixed(2)} {prod.stock <= 0 ? '(Sin stock)' : `(Stock: ${prod.stock})`}
                        </option>
                      ))}
                    </select>
                    {warnNoStock && <p className="mt-2 text-sm text-amber-400">Sin stock disponible</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                      value={row.quantity}
                      onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: Math.max(1, Number(e.target.value)) } : r))}
                    />
                    {warnQty && <p className="mt-2 text-sm text-amber-400">Cantidad supera el stock</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">Precio</label>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-200">{p ? `S/ ${p.price.toFixed(2)}` : '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">Subtotal</label>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-200">{p ? `S/ ${(p.price * row.quantity).toFixed(2)}` : '—'}</div>
                  </div>
                  <div className="md:col-span-12 flex justify-between">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                    >
                      Quitar fila
                    </button>
                    {idx === items.length - 1 && (
                      <button
                        type="button"
                        onClick={addRow}
                        className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white shadow-glow"
                      >
                        Agregar producto
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={!canSubmit || saving || items.some((it) => {
                const p = productById.get(it.productId as number)
                return p ? it.quantity > p.stock : true
              })}
              onClick={onCreate}
              className="inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-glow disabled:opacity-60"
            >
              Registrar Venta
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-medium">Ventas del día</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-300">Fecha:</label>
              <input
                type="date"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200">
                Total día: <span className="font-semibold">S/ {totalDay.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <table className="w-full table-auto text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2 font-medium">Fecha/Hora</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="px-2 py-2 font-medium">Items</th>
                <th className="px-2 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-slate-400">No hay ventas registradas.</td>
                </tr>
              )}
              {sales.map((s) => (
                <tr key={s.id} className="border-top border-white/5">
                  <td className="px-2 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-2">{s.customerName ?? '—'}</td>
                  <td className="px-2 py-2">
                    {s.items.map((it) => (
                      <div key={it.id} className="text-slate-300">
                        {it.product.name} × {it.quantity} — S/ {it.lineTotal.toFixed(2)}
                      </div>
                    ))}
                  </td>
                  <td className="px-2 py-2">S/ {s.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando ventas..." />
    </main>
  )
}
