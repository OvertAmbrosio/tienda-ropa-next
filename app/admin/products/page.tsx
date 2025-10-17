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
                <th className="px-2 py-2 font-medium text-right">Acciones</th>
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
                  <td className="px-2 py-2">{p.stock}</td>
                  <td className="px-2 py-2">{new Date(p.entryDate).toLocaleDateString()}</td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => onDelete(p.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 hover:bg-white/10">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando productos..." />
    </main>
  )
}
