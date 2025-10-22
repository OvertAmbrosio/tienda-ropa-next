"use client";

import { useEffect, useState } from "react";

type TrackThumb = { id: number; name: string; imageBase64?: string | null; qty: number };

type TrackHistory = {
  id: number;
  previousStatus?: string | null;
  newStatus: string;
  comment?: string | null;
  performedBy?: string | null;
  createdAt: string;
};

type TrackResponse = {
  sale: { id: number; trackingCode: string; status: string; createdAt: string; total: number };
  itemsCount: number;
  thumbs: TrackThumb[];
  histories: TrackHistory[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  ACCEPTED: "Aceptada",
  SHIPPING: "En camino",
  COMPLETED: "Finalizada",
  CANCELED: "Cancelada",
};

export default function TrackOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [trackCode, setTrackCode] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackData, setTrackData] = useState<TrackResponse | null>(null);

  // Reset data when closing modal
  useEffect(() => {
    if (!open) {
      setTrackCode("");
      setTrackData(null);
      setTrackError(null);
      setTrackLoading(false);
    }
  }, [open]);

  async function fetchTrack() {
    setTrackError(null);
    const code = trackCode.trim().toUpperCase();
    if (!code) {
      setTrackError("Ingrese su número de seguimiento");
      return;
    }
    setTrackLoading(true);
    try {
      const res = await fetch(`/api/public/track?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se encontró la orden");
      setTrackData(data as TrackResponse);
    } catch (e: any) {
      setTrackData(null);
      setTrackError(e?.message || "No se encontró la orden");
    } finally {
      setTrackLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative m-4 w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Rastrear pedido</h3>
        <div className="mb-4 flex gap-2">
          <input
            value={trackCode}
            onChange={(e) => setTrackCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchTrack(); }}
            placeholder="Ingresa tu número de seguimiento (ej. RS...)"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
          />
          <button
            onClick={fetchTrack}
            disabled={trackLoading || !trackCode.trim()}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {trackLoading ? "Buscando..." : "Rastrear"}
          </button>
        </div>
        {trackError && (
          <div className="mb-4 rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
            {trackError}
          </div>
        )}

        {trackData && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-300">
                <div>
                  <span className="text-slate-400">Código:</span> {trackData.sale.trackingCode}
                </div>
                <div>
                  <span className="text-slate-400">Estado:</span> {STATUS_LABELS[trackData.sale.status] || trackData.sale.status}
                </div>
                <div>
                  <span className="text-slate-400">Fecha:</span> {new Date(trackData.sale.createdAt).toLocaleString('es-PE')}
                </div>
                <div>
                  <span className="text-slate-400">Productos:</span> {trackData.itemsCount}
                </div>
                <div>
                  <span className="text-slate-400">Total:</span> S/ {trackData.sale.total.toFixed(2)}
                </div>
              </div>
            </div>

            {trackData.thumbs?.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {trackData.thumbs.map((t) => (
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
            )}

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-200">Historial</h4>
              {trackData.histories?.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 h-full w-px bg-white/10" />
                  <div className="space-y-4">
                    {trackData.histories.map((h) => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 shadow" />
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-medium text-slate-200">{STATUS_LABELS[h.newStatus] || h.newStatus}</div>
                            <div className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString('es-PE')}</div>
                          </div>
                          {h.comment && (
                            <div className="mt-1 text-sm text-slate-200">{h.comment}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Sin historial</div>
              )}
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="font-semibold mb-1">Información importante</div>
              <div className="text-amber-200/90">Si no recuerdas tu número de pedido o tienes alguna duda, contáctanos:</div>
              <ul className="mt-2 space-y-1 text-amber-100/90">
                <li>WhatsApp: +51 999 888 777</li>
                <li>Email: soporte@rusarfi.com</li>
                <li>Horario: Lun a Vie, 9:00 - 18:00</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
