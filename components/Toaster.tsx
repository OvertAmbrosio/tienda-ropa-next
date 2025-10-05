"use client"

import { useEffect, useState } from 'react'
import { toast as toastBus } from '@/lib/toast'

type Item = {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  durationMs: number
}

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<Item>).detail
      setItems((prev) => [...prev, detail])
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== detail.id))
      }, detail.durationMs)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(toastBus.EVENT_NAME, onToast as EventListener)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(toastBus.EVENT_NAME, onToast as EventListener)
      }
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end gap-3 p-4 sm:p-6">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            'pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border p-4 shadow-2xl ring-1 backdrop-blur transition-all',
            t.type === 'success' && 'border-emerald-400/25 bg-emerald-500/15 ring-emerald-400/20',
            t.type === 'error' && 'border-rose-400/25 bg-rose-500/15 ring-rose-400/20',
            t.type === 'info' && 'border-sky-400/25 bg-sky-500/15 ring-sky-400/20',
            t.type === 'warning' && 'border-amber-400/25 bg-amber-500/15 ring-amber-400/20',
          ].filter(Boolean).join(' ')}
        >
          <div className="flex items-start gap-3">
            <span className={[
              'mt-0.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full',
              t.type === 'success' && 'bg-emerald-400',
              t.type === 'error' && 'bg-rose-400',
              t.type === 'info' && 'bg-sky-400',
              t.type === 'warning' && 'bg-amber-400',
            ].filter(Boolean).join(' ')} />
            <div className="text-sm text-slate-100/95">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
