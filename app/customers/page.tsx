"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { runUiAction } from '@/lib/ui-action'
import ScreenLoader from '@/components/ScreenLoader'
import Link from 'next/link'

 type Customer = { id: number; name: string }

export default function CustomersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')

  async function load(q: string) {
    try {
      const res = await fetch(`/api/customers?query=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Error al cargar clientes')
      setItems(data.items as Customer[])
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar clientes')
    }
  }

  useEffect(() => {
    setLoading(true)
    load('').finally(() => setLoading(false))
  }, [])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { load(query) }, 250)
    return () => clearTimeout(t)
  }, [query])

  const canCreate = useMemo(() => name.trim().length > 1, [name])

  const onCreate = async () => {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'No se pudo crear cliente')
        return data.item as Customer
      },
      successMessage: 'Cliente guardado',
      onSuccess: (c) => {
        setName('')
        // refresh list using latest query
        load(query)
      },
    })
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <Link href="/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Volver al dashboard</Link>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Buscar</label>
            <input
              placeholder="Nombre del cliente"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm text-slate-300">Nuevo cliente</label>
            <div className="flex gap-2">
              <input
                placeholder="Nombre"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                disabled={!canCreate || saving}
                onClick={onCreate}
                className="inline-flex rounded-xl bg-brand-600 px-3 py-2.5 font-medium text-white shadow-glow disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Solo ADMIN puede crear.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <table className="w-full table-auto text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2 font-medium">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="px-2 py-6 text-center text-slate-400">No hay clientes.</td>
                </tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-2 py-2">{c.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando clientes..." />
    </main>
  )
}
