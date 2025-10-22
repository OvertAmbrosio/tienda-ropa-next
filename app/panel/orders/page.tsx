"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { runUiAction } from "@/lib/ui-action";
import ScreenLoader from "@/components/ScreenLoader";
import Link from "next/link";

type SaleItem = {
  id: number;
  product: { id: number; name: string; price: number };
  variant?: { id: number; optionKey: string } | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Customer = {
  id: number;
  name: string;
  email: string | null;
  address: string | null;
  phone?: string | null;
  documentNumber?: string | null;
};

type Sale = {
  id: number;
  trackingCode?: string | null;
  customer: Customer | null;
  customerId: number | null;
  saleDate: string;
  total: number;
  status: string;
  source: string;
  createdAt: string;
  items: SaleItem[];
  histories?: Array<{
    id: number;
    previousStatus?: string | null;
    newStatus: string;
    comment?: string | null;
    performedBy?: string | null;
    createdAt: string;
  }>;
};

type OrdersResponse = { items: Sale[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchOrderId, setSearchOrderId] = useState('');

  async function loadOrders(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('pageSize', String(pageSize));
      const trimmed = searchOrderId.trim();
      if (trimmed) params.set('orderId', trimmed);
      const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as OrdersResponse;
      if (!res.ok) throw new Error((data as any)?.message || "Error al cargar pedidos");
      setOrders(data.items);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (e: any) {
      toast.error(e.message || "Error al cargar pedidos");
      setOrders([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => {
    loadOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de pedidos</h1>
          <p className="mt-1 text-sm text-slate-400">Pedidos pendientes (excluye finalizados y cancelados)</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/panel/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Ir al dashboard</Link>
          <Link href="/panel/sales" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Ver ventas</Link>
          <button onClick={() => loadOrders(page)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Refrescar</button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-400">Total: {total}</div>
            <div className="hidden h-4 w-px bg-white/10 md:block" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Por página</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-slate-200"
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Buscar por N° o código"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadOrders(1); } }}
              className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
            />
            <button
              onClick={() => { setPage(1); loadOrders(1); }}
              className="rounded-lg border border-white/10 bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
            >
              Buscar
            </button>
            <button
              onClick={() => { setSearchOrderId(''); setPage(1); loadOrders(1); }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Limpiar
            </button>
          </div>
        </div>

        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="px-2 py-2">Pedido</th>
              <th className="px-2 py-2">Código</th>
              <th className="px-2 py-2">Fecha</th>
              <th className="px-2 py-2">Cliente</th>
              <th className="px-2 py-2">Unidades</th>
              <th className="px-2 py-2">Total</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2">Origen</th>
              <th className="px-2 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No hay pedidos pendientes</td>
              </tr>
            )}
            {orders.map((s) => (
              <OrderRow key={s.id} sale={s} onUpdated={() => loadOrders(page)} />
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            Anterior
          </button>
          <div className="text-sm text-slate-300">Página {page} de {totalPages}</div>
          <button
            disabled={loading || page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando pedidos..." />
    </main>
  );
}

function OrderRow({ sale, onUpdated }: { sale: Sale; onUpdated: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const statusLabel = STATUS_LABELS[sale.status] || sale.status;
  const statusColor = STATUS_COLORS[sale.status] || "bg-slate-500/20 text-slate-200 border-slate-400/30";
  const allowedTransitions = VALID_TRANSITIONS[sale.status] || [];

  const changeStatus = async () => {
    const newStatus = selectedStatus;
    if (!newStatus) return;
    await runUiAction({
      setLoading: setBusy,
      action: async () => {
        const res = await fetch(`/api/sales/${sale.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, comment: (comment?.trim() || "Estado actualizado") }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "No se pudo actualizar el estado");
        return true;
      },
      successMessage: `Estado actualizado a ${STATUS_LABELS[newStatus] || newStatus}`,
      onSuccess: () => {
        setShowModal(false);
        setComment("");
        setSelectedStatus("");
        onUpdated();
      },
    });
  };

  return (
    <>
      <tr className="border-t border-white/5">
        <td className="px-2 py-2 text-slate-100 whitespace-nowrap">#{sale.id}</td>
        <td className="px-2 py-2 text-slate-300 whitespace-nowrap">{sale.trackingCode ?? '—'}</td>
        <td className="px-2 py-2 text-slate-300 whitespace-nowrap">
          {new Date(sale.createdAt).toLocaleString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </td>
        <td className="px-2 py-2 text-slate-100">{sale.customer?.name ?? "—"}</td>
        <td className="px-2 py-2 text-slate-300">
          <span className="text-sm">{sale.items.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
        </td>
        <td className="px-2 py-2 text-slate-100 whitespace-nowrap">S/ {sale.total.toFixed(2)}</td>
        <td className="px-2 py-2">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusColor}`}>
            {statusLabel}
          </span>
        </td>
        <td className="px-2 py-2">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${sale.source === 'WEB' ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' : 'bg-slate-500/20 text-slate-200 border-slate-400/30'}`}>
            {sale.source === 'WEB' ? '🌐 Web' : '💼 Admin'}
          </span>
        </td>
        <td className="px-2 py-2 text-right">
          <div className="inline-flex items-center gap-2">
            <button onClick={() => setShowDetails(!showDetails)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 whitespace-nowrap">
              {showDetails ? 'Ocultar' : 'Ver detalle'}
            </button>
            <button
              onClick={() => { setSelectedStatus((allowedTransitions[0] || "")); setShowModal(true); }}
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
          <td colSpan={9} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-200">Información del cliente</h4>
                <div className="space-y-1 text-sm text-slate-300">
                  <div><span className="text-slate-400">Nombre:</span> {sale.customer?.name ?? '—'}</div>
                  <div><span className="text-slate-400">Email:</span> {sale.customer?.email ?? '—'}</div>
                  <div><span className="text-slate-400">Dirección:</span> {sale.customer?.address ?? '—'}</div>
                  <div><span className="text-slate-400">Teléfono:</span> {sale.customer?.phone ?? '—'}</div>
                  <div><span className="text-slate-400">Documento:</span> {sale.customer?.documentNumber ?? '—'}</div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-200">Detalle de productos</h4>
                <div className="space-y-1">
                  {sale.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm text-slate-300">
                      <span>
                        {it.product.name}
                        {it.variant?.optionKey ? (
                          <span className="text-slate-400"> ({it.variant.optionKey})</span>
                        ) : null}
                        {" "}× {it.quantity}
                      </span>
                      <span>S/ {it.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm font-medium text-slate-100">
                    <span>Total:</span>
                    <span>S/ {sale.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <h4 className="mb-2 text-sm font-medium text-slate-200">Historial de estados</h4>
                {sale.histories && sale.histories.length > 0 ? (
                  <div className="space-y-2 text-sm text-slate-300">
                    {sale.histories.map(h => (
                      <div key={h.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">{new Date(h.createdAt).toLocaleString('es-PE')}</span>
                          <span className="text-xs text-slate-400">{h.performedBy ?? '—'}</span>
                        </div>
                        <div className="text-xs text-slate-400">{STATUS_LABELS[h.previousStatus || 'PENDING'] ?? h.previousStatus} → {STATUS_LABELS[h.newStatus] ?? h.newStatus}</div>
                        {h.comment && <div className="mt-1 text-slate-200">{h.comment}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">Sin historial</div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}

      {showModal && (
        <tr>
          <td colSpan={9} className="p-0">
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
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Cambiar estado de pedido</h3>

                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-sm text-slate-300">
                    <div><span className="text-slate-400">Orden:</span> #{sale.id}</div>
                    <div><span className="text-slate-400">Cliente:</span> {sale.customer?.name ?? '—'}</div>
                    <div><span className="text-slate-400">Total:</span> S/ {sale.total.toFixed(2)}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-slate-400">Estado actual:</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm text-slate-300">Comentario (opcional)</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
                    placeholder="Escribe una nota sobre el cambio de estado"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <p className="mb-3 text-sm text-slate-300">Seleccione el nuevo estado:</p>
                  <div className="space-y-2">
                    {allowedTransitions.map((status) => (
                      <label key={status} className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`status-${sale.id}`}
                            value={status}
                            checked={selectedStatus === status}
                            onChange={() => setSelectedStatus(status)}
                            disabled={busy}
                            className="h-4 w-4 accent-emerald-500"
                          />
                          <span>{STATUS_LABELS[status]}</span>
                        </div>
                      </label>
                    ))}
                    {allowedTransitions.length === 0 && (
                      <div className="text-sm text-slate-400">No hay transiciones disponibles</div>
                    )}
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-3">
                  <button
                    onClick={changeStatus}
                    disabled={busy || !selectedStatus}
                    className="flex-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    Actualizar
                  </button>
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
