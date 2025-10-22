"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PublicNavbar({
  onCartClick,
  onTrackClick,
}: {
  onCartClick?: () => void;
  onTrackClick?: () => void;
}) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const raw = localStorage.getItem("cart");
        const cart = raw ? JSON.parse(raw) : [];
        const total = cart.reduce(
          (sum: number, item: any) => sum + (item.qty || 0),
          0
        );
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();
    // Actualizar cuando cambie el localStorage
    window.addEventListener("storage", updateCartCount);

    // Polling cada segundo para detectar cambios en la misma pestaña
    const interval = setInterval(updateCartCount, 1000);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Nombre de la tienda */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500">
              <span className="text-xl font-bold text-white">👕</span>
            </div>
            <span className="text-xl font-bold text-slate-100">Rusarfi</span>
          </Link>

          {/* Botones de navegación */}
          <div className="flex items-center gap-3">
            {/* Rastrear pedido */}
            {onTrackClick ? (
              <button
                type="button"
                onClick={onTrackClick}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.5 8c0 7.5-7.5 12-7.5 12S4.5 15.5 4.5 8a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Rastrear pedido</span>
                </div>
              </button>
            ) : (
              <Link
                href="/#track"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.5 8c0 7.5-7.5 12-7.5 12S4.5 15.5 4.5 8a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Rastrear pedido</span>
                </div>
              </Link>
            )}

            <Link
              href="/auth/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.121 17.804A9 9 0 1118 9m-6 6v3m0 0l-3-3m3 3l3-3"
                  />
                </svg>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </div>
            </Link>

            {onCartClick ? (
              <button
                type="button"
                onClick={onCartClick}
                className="relative rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Carrito</span>
                  {cartCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </div>
              </button>
            ) : (
              <Link
                href="/checkout"
                className="relative rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition-colors hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Carrito</span>
                  {cartCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
