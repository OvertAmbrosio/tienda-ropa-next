"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
// import { toast } from '@/lib/toast'

export default function CheckoutPage() {
  const [cart, setCart] = useState<Array<{ id: number; variantId?: number; variantLabel?: string; name: string; price: number; qty: number }>>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [thumbs, setThumbs] = useState<Array<{ id: number; name: string; imageBase64?: string | null; qty: number }>>([])
  const [itemsCount, setItemsCount] = useState(0)
  
  // Card payment fields (referential only)
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart')
      setCart(raw ? JSON.parse(raw) : [])
    } catch {
      setCart([])
    }
  }, [])

  const total = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart])

  // Validate card fields are complete
  const isCardValid = useMemo(() => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) return false
    if (cardNumber.replace(/\s/g, '').length < 13) return false
    if (cardExpiry.length < 5) return false
    if (cardCvv.length < 3) return false
    return true
  }, [cardNumber, cardName, cardExpiry, cardCvv])

  async function createPendingOrder() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, address, phone, documentNumber },
          items: cart.map((it) => (it.variantId ? { variantId: it.variantId, qty: it.qty } : { productId: it.id, qty: it.qty })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'No se pudo crear la orden')
      setOrderId(data.orderId)
      if (data?.trackingCode) setTrackingCode(String(data.trackingCode))
      setStep(2)
    } catch (err: any) {
      setError(err?.message || 'Error al crear la orden')
    } finally {
      setSubmitting(false)
    }
  }

  function formatCardNumber(value: string) {
    const cleaned = value.replace(/\s/g, '').replace(/\D/g, '')
    const limited = cleaned.slice(0, 16)
    const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited
    return formatted
  }

  function formatExpiry(value: string) {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  async function confirmPayment() {
    if (!orderId) return
    
    // Basic validation for card fields
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      setError('Por favor complete todos los datos de la tarjeta')
      return
    }
    if (cardNumber.replace(/\s/g, '').length < 13) {
      setError('Número de tarjeta inválido')
      return
    }
    if (cardCvv.length < 3) {
      setError('CVV inválido')
      return
    }
    
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
      const code = trackingCode || data?.item?.trackingCode || null
      if (code) {
        setTrackingCode(String(code))
        try {
          const tr = await fetch(`/api/public/track?code=${encodeURIComponent(String(code))}`, { cache: 'no-store' })
          const trData = await tr.json()
          if (tr.ok) {
            setThumbs(Array.isArray(trData?.thumbs) ? trData.thumbs : [])
            setItemsCount(Number(trData?.itemsCount || 0))
          }
        } catch {}
      }
      setSuccessOpen(true)
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
                if (!name || !email || !phone || !documentNumber || !address) return
                createPendingOrder()
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm text-slate-300">Nombre completo <span className="text-rose-400">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Email <span className="text-rose-400">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Teléfono <span className="text-rose-400">*</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Número de documento <span className="text-rose-400">*</span></label>
                <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Dirección <span className="text-rose-400">*</span></label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"/>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Usaremos tu teléfono y email para comunicarnos sobre tu pedido. Asegúrate de que sean reales.</span>
                </div>
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
                  <div key={`${it.id}-${it.variantId || 0}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-slate-100" title={it.name}>{it.name}</div>
                      {it.variantLabel && (
                        <div className="text-xs text-slate-400">{it.variantLabel}</div>
                      )}
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
          <section className="space-y-6">
            {/* Confirmation Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 text-lg font-medium">Confirmación</h2>
              <div className="space-y-2 text-sm text-slate-300">
                <div><span className="text-slate-400">Nombre:</span> {name}</div>
                <div><span className="text-slate-400">Email:</span> {email}</div>
                <div><span className="text-slate-400">Teléfono:</span> {phone}</div>
                <div><span className="text-slate-400">Documento:</span> {documentNumber}</div>
                <div><span className="text-slate-400">Dirección:</span> {address}</div>
              </div>
              <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
                <div className="text-sm text-emerald-200">
                  <div className="font-medium">Orden creada</div>
                  <div className="mt-1 text-emerald-300/80">Número de orden: <span className="font-semibold">#{orderId}</span></div>
                  <div className="mt-1 text-emerald-300/80">Estado: <span className="font-semibold">Pendiente de pago</span></div>
                </div>
              </div>
            </div>

            {/* Payment Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Datos de pago</h2>
                <div className="flex gap-2">
                  <div className="h-8 w-12 rounded border border-white/10 bg-white/5 p-1">
                    <svg viewBox="0 0 48 32" className="h-full w-full">
                      <rect width="48" height="32" rx="4" fill="#EB001B"/>
                      <circle cx="20" cy="16" r="10" fill="#FF5F00"/>
                      <circle cx="28" cy="16" r="10" fill="#F79E1B"/>
                    </svg>
                  </div>
                  <div className="h-8 w-12 rounded border border-white/10 bg-white/5 p-1">
                    <svg viewBox="0 0 48 32" className="h-full w-full">
                      <rect width="48" height="32" rx="4" fill="#0066B2"/>
                      <text x="24" y="20" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="Arial">VISA</text>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Número de tarjeta</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4 font-mono"
                    maxLength={19}
                  />
                </div>
                
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Nombre del titular</label>
                  <input
                    type="text"
                    placeholder="JUAN PÉREZ"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4 uppercase"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">Fecha de vencimiento</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4 font-mono"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4 font-mono"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
              
            </div>

            <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Este es un formulario de demostración. No se procesarán pagos reales hasta que se integre una pasarela de pago.</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <button disabled={submitting} onClick={() => { setStep(1); setOrderId(null); setError(null) }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 hover:bg-white/10 disabled:opacity-60">Atrás</button>
                <button disabled={submitting || !isCardValid} onClick={confirmPayment} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">{submitting ? 'Procesando pago...' : 'Confirmar pago'}</button>
              </div>
              {!isCardValid && !submitting && (
                <div className="rounded-lg border border-slate-400/20 bg-slate-500/10 p-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Complete todos los campos de la tarjeta para continuar con el pago</span>
                  </div>
                </div>
              )}
            </div>
            {error && <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>}
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
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative m-4 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setSuccessOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">¡Felicidades! Tu compra fue exitosa</h3>
            </div>
            {trackingCode && (
              <div className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                Número de seguimiento: <span className="font-semibold">{trackingCode}</span>
              </div>
            )}
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-slate-200">Resumen de tu compra</h4>
              {thumbs.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {thumbs.map(t => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                      <div className="h-10 w-10 overflow-hidden rounded bg-slate-800">
                        <img src={t.imageBase64 || '/placeholder-product.svg'} alt={t.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="text-sm text-slate-200">
                        <div className="truncate max-w-[140px]" title={t.name}>{t.name}</div>
                        <div className="text-xs text-slate-400">x{t.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-300">Gracias por tu compra.</div>
              )}
              {itemsCount > 0 && (
                <div className="mt-2 text-xs text-slate-400">Total de unidades: {itemsCount}</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { window.location.href = '/' }}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
              >
                Ir a inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
