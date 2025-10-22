"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/lib/toast'
import { runUiAction } from '@/lib/ui-action'
import ScreenLoader from '@/components/ScreenLoader'

 type UserItem = { id: number; email: string; name: string | null; roles: string[] }
 type RoleItem = { id: number; name: string }

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<UserItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [query, setQuery] = useState('')

  // create form
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [rolesSel, setRolesSel] = useState<string[]>([])

  const canCreate = useMemo(() => email.trim().length > 3 && password.trim().length >= 6, [email, password])

  async function load(q: string) {
    try {
      const res = await fetch(`/api/users?query=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Error al cargar usuarios')
      setItems(data.items as UserItem[])
      setRoles(data.roles as RoleItem[])
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar usuarios')
    }
  }

  useEffect(() => {
    setLoading(true)
    load('').finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { load(query) }, 250)
    return () => clearTimeout(t)
  }, [query])

  const toggleRoleSel = (roleName: string) => {
    setRolesSel((prev) => prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName])
  }

  const onCreate = async () => {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password, roles: rolesSel }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'No se pudo crear usuario')
        return true
      },
      successMessage: 'Usuario creado',
      onSuccess: () => {
        setEmail('')
        setName('')
        setPassword('')
        setRolesSel([])
        load(query)
      },
    })
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Administración de usuarios</h1>
          <Link href="/admin/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Volver al dashboard</Link>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Buscar</label>
            <input
              placeholder="Email o nombre"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-medium">Crear nuevo usuario</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Nombre</label>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
              <input type="password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-sm text-slate-300">Roles</label>
            <div className="flex flex-wrap gap-3">
              {roles.map((r) => (
                <label key={r.id} className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input type="checkbox" checked={rolesSel.includes(r.name)} onChange={() => toggleRoleSel(r.name)} />
                  {r.name}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <button disabled={!canCreate || saving} onClick={onCreate} className="rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white shadow-glow disabled:opacity-60">Crear usuario</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <table className="w-full table-auto text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2 font-medium">Email</th>
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Roles</th>
                <th className="px-2 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="px-2 py-6 text-center text-slate-400" colSpan={4}>No hay usuarios.</td>
                </tr>
              )}
              {items.map((u) => (
                <UserRow key={u.id} user={u} allRoles={roles} onUpdated={() => load(query)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando usuarios..." />
    </main>
  )
}

function UserRow({ user, allRoles, onUpdated }: { user: UserItem; allRoles: RoleItem[]; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState(user.email)
  const [name, setName] = useState(user.name ?? '')
  const [password, setPassword] = useState('')
  const [rolesSel, setRolesSel] = useState<string[]>(user.roles)

  const toggleRoleSel = (roleName: string) => {
    setRolesSel((prev) => prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName])
  }

  const save = async () => {
    await runUiAction({
      setLoading: setBusy,
      action: async () => {
        const payload: any = { email, name, roles: rolesSel }
        if (password.trim().length >= 6) payload.password = password
        const res = await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'No se pudo actualizar')
        return true
      },
      successMessage: 'Usuario actualizado',
      onSuccess: () => { setEditing(false); setPassword(''); onUpdated() },
    })
  }

  const remove = async () => {
    await runUiAction({
      setLoading: setBusy,
      action: async () => {
        const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'No se pudo eliminar')
        return true
      },
      successMessage: 'Usuario eliminado',
      onSuccess: () => onUpdated(),
    })
  }

  return (
    <tr className="border-t border-white/5">
      <td className="px-2 py-2">
        {editing ? (
          <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={email} onChange={(e) => setEmail(e.target.value)} />
        ) : (
          <span>{user.email}</span>
        )}
      </td>
      <td className="px-2 py-2">
        {editing ? (
          <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <span>{user.name ?? '-'}</span>
        )}
      </td>
      <td className="px-2 py-2">
        {editing ? (
          <div className="flex flex-wrap gap-3">
            {allRoles.map((r) => (
              <label key={r.id} className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={rolesSel.includes(r.name)} onChange={() => toggleRoleSel(r.name)} />
                {r.name}
              </label>
            ))}
          </div>
        ) : (
          <span>{user.roles.join(', ') || '-'}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right">
        {!editing ? (
          <div className="inline-flex gap-2">
            <button onClick={() => setEditing(true)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10">Editar</button>
            <button onClick={remove} className="rounded-lg border border-white/10 bg-rose-500/20 px-3 py-1.5 text-sm text-rose-100 hover:bg-rose-500/30">Eliminar</button>
          </div>
        ) : (
          <div className="inline-flex gap-2">
            <input type="password" placeholder="Nueva contraseña (opcional)" className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button disabled={busy} onClick={save} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white shadow-glow disabled:opacity-60">Guardar</button>
            <button disabled={busy} onClick={() => { setEditing(false); setEmail(user.email); setName(user.name ?? ''); setRolesSel(user.roles); setPassword('') }} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10">Cancelar</button>
          </div>
        )}
      </td>
    </tr>
  )
}
