"use client"

import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

export default function LogoutButton() {
  const router = useRouter()
  const onClick = async () => {
    try {
      await api.logout()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
      }
      toast.info('Sesión cerrada')
      router.push('/')
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cerrar sesión')
    }
  }
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
    >
      Cerrar sesión
    </button>
  )
}
