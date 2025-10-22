"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { runUiAction } from "@/lib/ui-action";
import ScreenLoader from "@/components/ScreenLoader";
import Link from "next/link";

type Product = { id: number; name: string; price: number; stock: number };

type SaleItem = {
  id: number;
  product: { id: number; name: string; price: number };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
type Customer = {
  id: number;
  name: string;
  email: string | null;
  address: string | null;
};
type Sale = {
  id: number;
  customer: Customer | null;
  customerId: number | null;
  saleDate: string;
  total: number;
  status: string;
  source: string;
  createdAt: string;
  items: SaleItem[];
};
type SalesListResponse = { items: Sale[] };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  ACCEPTED: "Aceptada",
  SHIPPING: "En camino",
  COMPLETED: "Finalizada",
  CANCELED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  PAID: "bg-blue-500/20 text-blue-200 border-blue-400/30",
  ACCEPTED: "bg-purple-500/20 text-purple-200 border-purple-400/30",
  SHIPPING: "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
  COMPLETED: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  CANCELED: "bg-rose-500/20 text-rose-200 border-rose-400/30",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELED"],
  PAID: ["ACCEPTED", "CANCELED"],
  ACCEPTED: ["SHIPPING", "CANCELED"],
  SHIPPING: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

type NewItem = { productId: number | ""; quantity: number };

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerOpts, setCustomerOpts] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [showCustomerOpts, setShowCustomerOpts] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [saleDate, setSaleDate] = useState(todayISO());
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(tomorrowISO());
  const [items, setItems] = useState<NewItem[]>([
    { productId: "", quantity: 1 },
  ]);

  const canSubmit = useMemo(() => {
    if (!items.length) return false;
    return items.every(
      (it) => Number.isFinite(it.productId) && it.quantity > 0
    );
  }, [items]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const total = useMemo(() => {
    return items.reduce((acc, it) => {
      if (!Number.isFinite(it.productId as number)) return acc;
      const p = productById.get(it.productId as number);
      if (!p) return acc;
      return acc + p.price * it.quantity;
    }, 0);
  }, [items, productById]);

  async function loadProducts() {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || "Error al cargar productos");
      setProducts(data.items);
    } catch (e: any) {
      toast.error(e.message || "Error al cargar productos");
    }
  }

  async function loadSalesFor(start: string, end: string) {
    setLoadingSales(true);
    try {
      const res = await fetch(`/api/sales?startDate=${start}&endDate=${end}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SalesListResponse;
      if (!res.ok)
        throw new Error((data as any)?.message || "Error al cargar ventas");
      setSales(data.items);
    } catch (e: any) {
      toast.error(e.message || "Error al cargar ventas");
    } finally {
      setLoadingSales(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProducts(), loadSalesFor(startDate, endDate)]).finally(
      () => setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // recargar historial cuando cambien las fechas
    loadSalesFor(startDate, endDate);
  }, [startDate, endDate]);

  const addRow = () =>
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeRow = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  // Debounced customer search
  useEffect(() => {
    const q = customerName.trim();
    if (q.length < 2) {
      setCustomerOpts([]);
      setShowCustomerOpts(false);
      setSearchingCustomer(false);
      return;
    }
    setSearchingCustomer(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customers?query=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok) {
          setCustomerOpts(data.items ?? []);
          setShowCustomerOpts((data.items ?? []).length > 0);
        }
      } catch {
        // ignore
      } finally {
        setSearchingCustomer(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [customerName]);

  const onCreate = async () => {
    const payload = {
      customerName: customerName.trim() || null,
      saleDate,
      items: items
        .filter((it) => Number.isFinite(it.productId as number))
        .map((it) => ({
          productId: Number(it.productId),
          quantity: it.quantity,
        })),
    };

    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "No se pudo registrar la venta");
        return data.item as Sale;
      },
      successMessage: "Venta registrada",
      onSuccess: async () => {
        setCustomerName("");
        setItems([{ productId: "", quantity: 1 }]);
        await Promise.all([loadProducts(), loadSalesFor(startDate, endDate)]);
      },
    });
  };

  const totalDay = useMemo(
    () => sales.reduce((acc, s) => acc + s.total, 0),
    [sales]
  );

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gestión de Ventas</h1>
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            Volver al dashboard
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">
                Cliente
              </label>
              <div className="relative">
                <input
                  placeholder="Nombre del cliente (opcional)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onFocus={() => setShowCustomerOpts(customerOpts.length > 0)}
                  onBlur={() =>
                    setTimeout(() => setShowCustomerOpts(false), 120)
                  }
                />
                {searchingCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {showCustomerOpts && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur">
                    {customerOpts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCustomerName(c.name);
                          setShowCustomerOpts(false);
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
              <label className="mb-2 block text-sm text-slate-300">
                Fecha de la venta
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-emerald-200">
                Total actual:{" "}
                <span className="font-semibold">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {items.map((row, idx) => {
              const p = Number.isFinite(row.productId as number)
                ? productById.get(row.productId as number)
                : undefined;
              const warnNoStock = p && p.stock <= 0;
              const warnQty = p && row.quantity > p.stock;
              return (
                <div key={idx} className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-6">
                    <label className="mb-2 block text-sm text-slate-300">
                      Producto
                    </label>
                    <select
                      className="select-dark w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                      value={row.productId as any}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  productId: (e.target.value
                                    ? Number(e.target.value)
                                    : "") as any,
                                }
                              : r
                          )
                        )
                      }
                    >
                      <option value="">Seleccione producto</option>
                      {products.map((prod) => (
                        <option
                          key={prod.id}
                          value={prod.id}
                          disabled={prod.stock <= 0}
                        >
                          {prod.name} — S/ {prod.price.toFixed(2)}{" "}
                          {prod.stock <= 0
                            ? "(Sin stock)"
                            : `(Stock: ${prod.stock})`}
                        </option>
                      ))}
                    </select>
                    {warnNoStock && (
                      <p className="mt-2 text-sm text-amber-400">
                        Sin stock disponible
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                      value={row.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  quantity: Math.max(1, Number(e.target.value)),
                                }
                              : r
                          )
                        )
                      }
                    />
                    {warnQty && (
                      <p className="mt-2 text-sm text-amber-400">
                        Cantidad supera el stock
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">
                      Precio
                    </label>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-200">
                      {p ? `S/ ${p.price.toFixed(2)}` : "—"}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-300">
                      Subtotal
                    </label>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-200">
                      {p ? `S/ ${(p.price * row.quantity).toFixed(2)}` : "—"}
                    </div>
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
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={
                !canSubmit ||
                saving ||
                items.some((it) => {
                  const p = productById.get(it.productId as number);
                  return p ? it.quantity > p.stock : true;
                })
              }
              onClick={onCreate}
              className="inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-glow disabled:opacity-60"
            >
              Registrar Venta
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 relative">
          {loadingSales && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-900/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-8 w-8 animate-spin text-slate-200" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-slate-300">Cargando ventas...</span>
              </div>
            </div>
          )}
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Listado de ventas</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadSalesFor(startDate, endDate)}
                  disabled={loadingSales}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  title="Actualizar listado"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </button>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200">
                  Total período:{" "}
                  <span className="font-semibold">S/ {totalDay.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-300">Desde:</label>
              <input
                type="date"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <label className="text-sm text-slate-300">Hasta:</label>
              <input
                type="date"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <table className="w-full table-auto text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2 font-medium">Fecha/Hora</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="px-2 py-2 font-medium">Items</th>
                <th className="px-2 py-2 font-medium">Total</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">Origen</th>
                <th className="px-2 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-6 text-center text-slate-400"
                  >
                    No hay ventas registradas.
                  </td>
                </tr>
              )}
              {sales.map((s) => (
                <SaleRow
                  key={s.id}
                  sale={s}
                  onUpdated={async () => await loadSalesFor(startDate, endDate)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando ventas..." />
    </main>
  );
}

function SaleRow({ sale, onUpdated }: { sale: Sale; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const statusLabel = STATUS_LABELS[sale.status] || sale.status;
  const statusColor =
    STATUS_COLORS[sale.status] ||
    "bg-slate-500/20 text-slate-200 border-slate-400/30";
  const allowedTransitions = VALID_TRANSITIONS[sale.status] || [];

  const changeStatus = async (newStatus: string) => {
    await runUiAction({
      setLoading: setBusy,
      action: async () => {
        const res = await fetch(`/api/sales/${sale.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "No se pudo actualizar el estado");
        return true;
      },
      successMessage: `Estado actualizado a ${STATUS_LABELS[newStatus]}`,
      onSuccess: () => {
        // Close modal and trigger table reload
        setShowModal(false);
        onUpdated();
      },
    });
  };

  return (
    <>
      <tr className="border-t border-white/5">
        <td className="px-2 py-2 text-slate-300 whitespace-nowrap">
          {new Date(sale.createdAt).toLocaleString('es-PE', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </td>
        <td className="px-2 py-2 text-slate-100">{sale.customer?.name ?? "—"}</td>
        <td className="px-2 py-2 text-slate-300">
          <span className="text-sm">
            {sale.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
          </span>
        </td>
        <td className="px-2 py-2 text-slate-100 whitespace-nowrap">S/ {sale.total.toFixed(2)}</td>
        <td className="px-2 py-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusColor}`}
          >
            {statusLabel}
          </span>
        </td>
        <td className="px-2 py-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
              sale.source === 'WEB'
                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                : 'bg-slate-500/20 text-slate-200 border-slate-400/30'
            }`}
          >
            {sale.source === 'WEB' ? '🌐 Web' : '💼 Admin'}
          </span>
        </td>
        <td className="px-2 py-2 text-right">
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 whitespace-nowrap"
            >
              {showDetails ? 'Ocultar' : 'Ver detalle'}
            </button>
            <button
              onClick={() => setShowModal(true)}
              disabled={allowedTransitions.length === 0}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cambiar estado
            </button>
          </div>
        </td>
      </tr>
      {showDetails && (
        <tr className="border-t border-white/5 bg-white/5">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-200">Información del cliente</h4>
                <div className="space-y-1 text-sm text-slate-300">
                  <div><span className="text-slate-400">Nombre:</span> {sale.customer?.name ?? '—'}</div>
                  <div><span className="text-slate-400">Email:</span> {sale.customer?.email ?? '—'}</div>
                  <div><span className="text-slate-400">Dirección:</span> {sale.customer?.address ?? '—'}</div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-200">Detalle de productos</h4>
                <div className="space-y-1">
                  {sale.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm text-slate-300">
                      <span>{it.product.name} × {it.quantity}</span>
                      <span>S/ {it.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm font-medium text-slate-100">
                    <span>Total:</span>
                    <span>S/ {sale.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Modal para cambiar estado */}
      {showModal && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !busy && setShowModal(false)}>
              <div className="relative m-4 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={busy}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Cambiar estado de venta</h3>
                
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-sm text-slate-300">
                    <div><span className="text-slate-400">Orden:</span> #{sale.id}</div>
                    <div><span className="text-slate-400">Cliente:</span> {sale.customer?.name ?? '—'}</div>
                    <div><span className="text-slate-400">Total:</span> S/ {sale.total.toFixed(2)}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-slate-400">Estado actual:</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-3 text-sm text-slate-300">Seleccione el nuevo estado:</p>
                  <div className="space-y-2">
                    {allowedTransitions.map((status) => (
                      <button
                        key={status}
                        disabled={busy}
                        onClick={() => changeStatus(status)}
                        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60"
                      >
                        <span>{STATUS_LABELS[status]}</span>
                        {busy ? (
                          <svg className="h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  disabled={busy}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
