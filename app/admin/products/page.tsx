"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { runUiAction } from '@/lib/ui-action'
import ScreenLoader from '@/components/ScreenLoader'
import Link from 'next/link'

type Product = { id: number; name: string; price: number; stock: number; entryDate: string }

type ListResponse = { items: Product[] }

type CreateInput = { name: string; price: number; stock: number; entryDate?: string }

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingStock, setAddingStock] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockToAdd, setStockToAdd] = useState<number>(0)

  const [form, setForm] = useState<CreateInput>({ name: '', price: 0, stock: 0, entryDate: '' })

  const canSubmit = useMemo(() => form.name.trim() && form.price >= 0 && form.stock >= 0, [form])

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/products', { cache: 'no-store' })
      const data = (await res.json()) as ListResponse
      if (!res.ok) throw new Error((data as any)?.message || 'Error al cargar productos')
      setItems(data.items)
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const onCreate = async () => {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'No se pudo crear')
        return data.item as Product
      },
      successMessage: 'Producto agregado',
      onSuccess: (item) => {
        setForm({ name: '', price: 0, stock: 0, entryDate: '' })
        setItems((prev) => [item, ...prev])
      },
    })
  }

  const onAddStock = async () => {
    if (!selectedProduct || stockToAdd <= 0) return
    await runUiAction({
      setLoading: setAddingStock,
      action: async () => {
        const res = await fetch(`/api/products/${selectedProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockToAdd }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'No se pudo agregar stock')
        return data.item as Product
      },
      successMessage: `Stock agregado: +${stockToAdd} unidades`,
      onSuccess: (updated) => {
        setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        setSelectedProduct(null)
        setStockToAdd(0)
      },
    })
  }

  const onDelete = async (id: number) => {
    await runUiAction({
      action: async () => {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'No se pudo eliminar')
        return true
      },
      successMessage: 'Producto eliminado',
      onSuccess: () => setItems((prev) => prev.filter((p) => p.id !== id)),
      errorMessage: 'No se pudo eliminar',
    })
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gestión de Productos</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchItems}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60"
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
            <Link href="/admin/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Volver al dashboard</Link>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Nombre del Producto</label>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Precio</label>
              <input type="number" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Stock</label>
              <input type="number" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Fecha de Ingreso</label>
              <input type="date" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button disabled={!canSubmit || saving} onClick={onCreate} className="inline-flex rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white shadow-glow disabled:opacity-60">Agregar Producto</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <table className="w-full table-auto text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Precio</th>
                <th className="px-2 py-2 font-medium">Stock</th>
                <th className="px-2 py-2 font-medium">Fecha de Ingreso</th>
                <th className="px-2 py-2 font-medium text-right" colSpan={2}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-400">No hay productos disponibles.</td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-2 py-2">{p.name}</td>
                  <td className="px-2 py-2">S/ {p.price.toFixed(2)}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.stock <= 5
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                        : p.stock <= 20
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                        : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                    }`}>
                      {p.stock} {p.stock === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </td>
                  <td className="px-2 py-2">{new Date(p.entryDate).toLocaleDateString()}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => {
                        setSelectedProduct(p)
                        setStockToAdd(0)
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 whitespace-nowrap"
                    >
                      + Stock
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => onDelete(p.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar stock */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !addingStock && setSelectedProduct(null)}>
          <div className="relative m-4 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedProduct(null)}
              disabled={addingStock}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Agregar Stock</h3>
            
            <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-sm text-slate-300">
                <div><span className="text-slate-400">Producto:</span> {selectedProduct.name}</div>
                <div className="mt-1"><span className="text-slate-400">Stock actual:</span> <span className="font-semibold">{selectedProduct.stock}</span> unidades</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-slate-300">Cantidad a agregar</label>
              <input
                type="number"
                min="1"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                placeholder="Ej: 50"
                autoFocus
              />
              {stockToAdd > 0 && (
                <div className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                  Stock final: <span className="font-semibold">{selectedProduct.stock + stockToAdd}</span> unidades
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                disabled={addingStock}
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 hover:bg-white/10 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                disabled={addingStock || stockToAdd <= 0}
                onClick={onAddStock}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {addingStock ? 'Agregando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ScreenLoader active={loading} message="Cargando productos..." />
    </main>
  )
}
