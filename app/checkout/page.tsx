"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export default function CheckoutPage() {
  const [cart, setCart] = useState<Array<{ id: number; name: string; price: number; qty: number }>>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [orderId, setOrderId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart')
      setCart(raw ? JSON.parse(raw) : [])
    } catch {
      setCart([])
    }
  }, [])

  const total = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart])

  async function createPendingOrder() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, address },
          items: cart.map((it) => ({ id: it.id, qty: it.qty })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'No se pudo crear la orden')
      setOrderId(data.orderId)
      setStep(2)
    } catch (err: any) {
      setError(err?.message || 'Error al crear la orden')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmPayment() {
    if (!orderId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'No se pudo confirmar el pago')
      localStorage.setItem('cart', JSON.stringify([]))
      alert(`¡Pago confirmado! Orden #${orderId} procesada. ¡Gracias por tu compra!`)
      window.location.href = '/'
    } catch (err: any) {
      setError(err?.message || 'Error al confirmar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <Link href="/" className="text-sm text-slate-300 underline underline-offset-4 hover:text-white">Volver a la tienda</Link>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${step === 1 ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300'}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-300'}`}>1</div>
            <span>Datos y resumen</span>
          </div>
          <div className="h-px w-10 bg-white/10" />
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${step === 2 ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300'}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-300'}`}>2</div>
            <span>Pagar y finalizar</span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Datos del comprador</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!name || !email || !address) return
                createPendingOrder()
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm text-slate-300">Nombre completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Dirección</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <button disabled={submitting || cart.length === 0} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-60">{submitting ? 'Creando orden...' : 'Continuar a pago'}</button>
              {error && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>}
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Resumen de compra</h2>
            {cart.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-slate-300">Tu carrito está vacío.</div>
            ) : (
              <div className="space-y-3">
                {cart.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-slate-100" title={it.name}>{it.name}</div>
                      <div className="text-sm text-slate-400">{it.qty} x S/ {it.price.toFixed(2)}</div>
                    </div>
                    <div className="text-slate-100">S/ {(it.price * it.qty).toFixed(2)}</div>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-slate-200">
                  <span>Total</span>
                  <span className="text-lg font-semibold">S/ {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Confirmación</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <div><span className="text-slate-400">Nombre:</span> {name}</div>
              <div><span className="text-slate-400">Email:</span> {email}</div>
              <div><span className="text-slate-400">Dirección:</span> {address}</div>
            </div>
            <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="text-sm text-emerald-200">
                <div className="font-medium">Orden creada</div>
                <div className="mt-1 text-emerald-300/80">Número de orden: <span className="font-semibold">#{orderId}</span></div>
                <div className="mt-1 text-emerald-300/80">Estado: <span className="font-semibold">Pendiente de pago</span></div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button disabled={submitting} onClick={() => { setStep(1); setOrderId(null); setError(null) }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 hover:bg-white/10 disabled:opacity-60">Atrás</button>
              <button disabled={submitting} onClick={confirmPayment} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60">{submitting ? 'Procesando pago...' : 'Pagar ahora'}</button>
            </div>
            {error && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Resumen de compra</h2>
            {cart.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-slate-300">Tu carrito está vacío.</div>
            ) : (
              <div className="space-y-3">
                {cart.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-slate-100" title={it.name}>{it.name}</div>
                      <div className="text-sm text-slate-400">{it.qty} x S/ {it.price.toFixed(2)}</div>
                    </div>
                    <div className="text-slate-100">S/ {(it.price * it.qty).toFixed(2)}</div>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-slate-200">
                  <span>Total</span>
                  <span className="text-lg font-semibold">S/ {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
