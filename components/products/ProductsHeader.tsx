"use client";

import Link from "next/link";

interface ProductsHeaderProps {
  onRefresh: () => void;
  loading: boolean;
}

export default function ProductsHeader({ onRefresh, loading }: ProductsHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de Productos</h1>
        <p className="text-sm text-slate-400">
          Gestiona los productos base de tu tienda
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60"
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
        <Link
          href="/panel/stock"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
        >
          Gestión de Stock
        </Link>
        <Link
          href="/panel/dashboard"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
