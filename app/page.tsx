"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScreenLoader from "@/components/ScreenLoader";
import PublicNavbar from "@/components/PublicNavbar";
import TrackOrderModal from "@/components/TrackOrderModal";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  entryDate: string;
};

export default function CatalogPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "price_asc" | "price_desc">("new");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [cartItems, setCartItems] = useState<
    Array<{
      id: number;
      variantId?: number;
      variantLabel?: string;
      name: string;
      price: number;
      qty: number;
      maxStock?: number;
    }>
  >([]);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    PAID: "Pagada",
    ACCEPTED: "Aceptada",
    SHIPPING: "En camino",
    COMPLETED: "Finalizada",
    CANCELED: "Cancelada",
  };

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem("cart") : null;
      if (!raw) return;
      const cart = JSON.parse(raw) as Array<{
        id: number;
        name: string;
        price: number;
        qty: number;
        maxStock?: number;
      }>;
      setCartItems(cart);
      setCartCount(cart.reduce((a, c) => a + (c.qty || 1), 0));
    } catch {
      // ignore
    }
  }, []);

  // Sync cart across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "cart") {
        try {
          const next = e.newValue
            ? (JSON.parse(e.newValue) as Array<{
                id: number;
                name: string;
                price: number;
                qty: number;
              }>)
            : [];
          setCartItems(next);
          setCartCount(next.reduce((a, c) => a + (c.qty || 1), 0));
        } catch {}
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);

  function updateQty(id: number, variantId: number | undefined, delta: number) {
    setCartItems((prev) => {
      const next = prev.map((it) => {
        if (it.id !== id || (it.variantId || 0) !== (variantId || 0)) return it;
        const max = it.maxStock ?? Infinity;
        const newQty = Math.max(1, Math.min(max, it.qty + delta));
        return { ...it, qty: newQty };
      });
      localStorage.setItem("cart", JSON.stringify(next));
      setCartCount(next.reduce((a, c) => a + (c.qty || 1), 0));
      return next;
    });
  }

  function removeFromCart(id: number, variantId?: number) {
    setCartItems((prev) => {
      const next = prev.filter(
        (it) => !(it.id === id && (it.variantId || 0) === (variantId || 0))
      );
      localStorage.setItem("cart", JSON.stringify(next));
      setCartCount(next.reduce((a, c) => a + (c.qty || 1), 0));
      return next;
    });
  }

  const cartTotal = cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (sort) params.set("sort", sort);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        const res = await fetch(`/api/public/products?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Error al cargar productos");
        setItems((data.items as Product[]) || []);
        setTotal(Number(data?.pagination?.total || 0));
      } catch {
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [q, sort, page, pageSize]);

  // fetchTrack ahora vive dentro de TrackOrderModal

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#track") {
      setIsTrackOpen(true);
    }
  }, []);

  return (
    <>
      <PublicNavbar
        onCartClick={() => setIsCartOpen(true)}
        onTrackClick={() => setIsTrackOpen(true)}
      />

      <main className="min-h-screen">
        {/* Cart Drawer */}
        {isCartOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            />
            <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-slate-950/95 p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Tu carrito</h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>
              <div
                className="space-y-3 overflow-y-auto pr-2"
                style={{ maxHeight: "calc(100vh - 220px)" }}
              >
                {cartItems.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-slate-300">
                    Tu carrito está vacío.
                  </div>
                )}
                {cartItems.map((it) => (
                  <div
                    key={`${it.id}-${it.variantId || 0}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-slate-100" title={it.name}>
                        {it.name}
                      </div>
                      {it.variantLabel && (
                        <div className="text-xs text-slate-400">
                          {it.variantLabel}
                        </div>
                      )}
                      <div className="text-sm text-slate-400">
                        S/ {it.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={it.qty <= 1}
                        onClick={() => updateQty(it.id, it.variantId, -1)}
                        className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        -
                      </button>
                      <div className="w-8 text-center text-slate-100">
                        {it.qty}
                      </div>
                      <button
                        disabled={(it.maxStock ?? Infinity) <= it.qty}
                        onClick={() => updateQty(it.id, it.variantId, 1)}
                        className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(it.id, it.variantId)}
                        className="ml-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-rose-100 hover:bg-rose-500/20"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-3 flex items-center justify-between text-slate-200">
                  <span>Total</span>
                  <span className="text-lg font-semibold">
                    S/ {cartTotal.toFixed(2)}
                  </span>
                </div>
                <button
                  disabled={cartItems.length === 0}
                  onClick={() => {
                    setIsCartOpen(false);
                    if (typeof window !== "undefined")
                      window.location.href = "/checkout";
                  }}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white shadow-glow hover:bg-emerald-500 disabled:opacity-60"
                >
                  Pagar
                </button>
              </div>
            </aside>
          </>
        )}
        <section className="relative h-72 w-full overflow-hidden">
          <img
            src="/store-banner-fashion.svg"
            alt="RUSARFI"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl font-semibold text-white drop-shadow">
              RUSARFI
            </h1>
            <p className="mt-1 max-w-2xl text-slate-200">
              Catálogo de ropa para todos los estilos.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Productos</h2>
              <p className="mt-1 text-sm text-slate-400">
                Encuentra tus prendas favoritas.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  placeholder="Buscar productos..."
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4 sm:w-50"
                />
                <span className="text-sm text-slate-400">Ordenar por:</span>
                <button
                  onClick={() => {
                    setPage(1);
                    setSort("new");
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    sort === "new"
                      ? "bg-emerald-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Novedades
                </button>
                <button
                  onClick={() => {
                    setPage(1);
                    setSort("price_asc");
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    sort === "price_asc"
                      ? "bg-emerald-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Precio: menor a mayor
                </button>
                <button
                  onClick={() => {
                    setPage(1);
                    setSort("price_desc");
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    sort === "price_desc"
                      ? "bg-emerald-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Precio: mayor a menor
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <div
                key={p.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-800">
                  <img
                    src={(p as any).imageBase64 || "/placeholder-product.svg"}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02] select-none"
                    draggable={false}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = "/hero-fashion.jpg";
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="truncate pr-2 text-slate-100" title={p.name}>
                    {p.name}
                  </div>
                  <div className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-sm text-emerald-200">
                    S/ {p.price.toFixed(2)}
                  </div>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/products/${p.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow hover:bg-brand-500"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            ))}
            {!loading && items.length === 0 && (
              <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
                No hay productos disponibles.
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-sm text-slate-400">
              Mostrando {items.length} de {total} productos
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                Anterior
              </button>
              <div className="min-w-[5rem] text-center text-sm text-slate-300">
                Página {page}
              </div>
              <button
                disabled={loading || page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        <ScreenLoader active={loading} message="Cargando catálogo..." />

        <TrackOrderModal open={isTrackOpen} onClose={() => setIsTrackOpen(false)} />
      </main>
    </>
  );
}
