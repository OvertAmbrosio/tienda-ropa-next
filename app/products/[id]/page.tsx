"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import { toast } from "@/lib/toast";

type OptionValue = { id: number; value: string; hexColor?: string | null };
type ProductOption = {
  id: number;
  name: string;
  position: number;
  values: OptionValue[];
};

type VariantValue = {
  optionId: number;
  optionName: string;
  optionPosition: number;
  valueId: number;
  value: string;
  hexColor?: string | null;
};

type Variant = {
  id: number;
  sku: string;
  price: number | null;
  stock: number;
  isActive: boolean;
  optionKey: string;
  values: VariantValue[];
};

type Feature = { id: number; name: string; value: string };

type ProductDetail = {
  id: number;
  name: string;
  price: number;
  stock: number;
  imageBase64?: string | null;
  entryDate: string;
  options: ProductOption[];
  variants: Variant[];
  features: Feature[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ProductDetail | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [qty, setQty] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);
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

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("cart") : null;
      if (!raw) return;
      const cart = JSON.parse(raw) as Array<{
        id: number;
        name: string;
        price: number;
        qty: number;
        maxStock?: number;
      }>;
      setCartItems(cart);
    } catch {}
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "cart") {
        try {
          const next = e.newValue
            ? (JSON.parse(e.newValue) as Array<{ id: number; name: string; price: number; qty: number }>)
            : [];
          setCartItems(next);
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
      return next;
    });
  }

  function removeFromCart(id: number, variantId?: number) {
    setCartItems((prev) => {
      const next = prev.filter((it) => !(it.id === id && (it.variantId || 0) === (variantId || 0)));
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
  }

  const cartTotal = cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Función para normalizar hexColor (agregar # si no lo tiene)
  function normalizeHexColor(hexColor: string | null | undefined): string {
    if (!hexColor) return "#6b7280"; // Color por defecto (gris)
    const trimmed = hexColor.trim();
    // Si ya tiene #, devolverlo tal cual
    if (trimmed.startsWith("#")) return trimmed;
    // Si no tiene #, agregarlo
    return `#${trimmed}`;
  }

  // Función para seleccionar automáticamente la primera talla disponible
  function autoSelectCompatibleOptions(
    newSelected: Record<number, number>,
    options: ProductOption[],
    variants: Variant[]
  ) {
    const result = { ...newSelected };

    // Para cada opción que no está seleccionada, intentar seleccionar la primera compatible
    for (const option of options) {
      if (result[option.id]) continue; // Ya está seleccionada

      // Buscar el primer valor que tenga stock con las selecciones actuales
      const compatibleValue = option.values.find((val) => {
        return variants.some((variant) => {
          if (variant.stock <= 0) return false;
          const variantValueIds = new Set(variant.values.map((v) => v.valueId));

          // Debe tener este valor
          if (!variantValueIds.has(val.id)) return false;

          // Debe tener todos los valores ya seleccionados
          return Object.entries(result).every(([optId, valId]) => {
            return variantValueIds.has(Number(valId));
          });
        });
      });

      if (compatibleValue) {
        result[option.id] = compatibleValue.id;
      }
    }

    return result;
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/public/products/${productId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Producto no encontrado");
        const detail = data.item as ProductDetail;
        setItem(detail);

        // Preseleccionar automáticamente la primera combinación con stock
        if (detail.variants && detail.variants.length > 0) {
          // Buscar la primera variante con stock
          const firstAvailable = detail.variants.find((v) => v.stock > 0);
          if (firstAvailable) {
            const initial: Record<number, number> = {};
            firstAvailable.values.forEach((val) => {
              initial[val.optionId] = val.valueId;
            });
            setSelected(initial);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Error al cargar producto");
      } finally {
        setLoading(false);
      }
    };
    if (Number.isFinite(productId)) load();
  }, [productId]);

  const currentVariant = useMemo(() => {
    if (!item) return null;
    if (!item.options?.length) return null;
    const selectedEntries = Object.entries(selected);
    if (selectedEntries.length !== item.options.length) return null;
    // match variant that contains all selected valueIds
    for (const v of item.variants || []) {
      const valueIds = new Set(v.values.map((x) => x.valueId));
      const allMatch = selectedEntries.every(([opId, valId]) =>
        valueIds.has(Number(valId))
      );
      if (allMatch) return v;
    }
    return null;
  }, [item, selected]);

  const unitPrice = currentVariant?.price ?? item?.price ?? 0;
  const availableStock = currentVariant
    ? currentVariant.stock
    : item?.stock ?? 0;

  function addToCart() {
    if (!item) return;
    try {
      const raw = localStorage.getItem("cart");
      const cart: Array<{
        id: number;
        variantId?: number;
        variantLabel?: string;
        name: string;
        price: number;
        qty: number;
        maxStock?: number;
      }> = raw ? JSON.parse(raw) : [];

      let variantLabel: string | undefined;
      let variantId: number | undefined;
      let maxStock: number | undefined;
      let price = unitPrice;

      if (currentVariant) {
        variantId = currentVariant.id;
        maxStock = currentVariant.stock;
        // construir etiqueta legible
        const parts = currentVariant.values
          .sort(
            (a, b) =>
              a.optionPosition - b.optionPosition ||
              a.optionName.localeCompare(b.optionName)
          )
          .map((x) => `${x.optionName}: ${x.value}`);
        variantLabel = parts.join(" | ");
      } else {
        maxStock = item.stock;
      }

      // buscar ítem existente por product + variant
      const idx = cart.findIndex(
        (c) => c.id === item.id && (c.variantId || 0) === (variantId || 0)
      );
      if (idx >= 0) {
        cart[idx].qty = Math.min(
          (cart[idx].qty || 0) + qty,
          cart[idx].maxStock ?? Infinity
        );
        cart[idx].price = price;
        cart[idx].variantLabel = variantLabel;
      } else {
        cart.push({
          id: item.id,
          variantId,
          variantLabel,
          name: item.name,
          price,
          qty: Math.max(1, qty),
          maxStock,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      // Update local UI state immediately so the drawer reflects the new items without reload
      setCartItems(cart);

      // Mostrar notificación de éxito y permitir continuar comprando
      toast.success("¡pantalon de ingeniero agregado al carrito!");
      // Resetear cantidad a 1
      setQty(1);
    } catch {}
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
          Cargando…
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Producto</h1>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            Volver
          </Link>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
          {error || "No encontrado"}
        </div>
      </main>
    );
  }

  return (
    <>
      <PublicNavbar onCartClick={() => setIsCartOpen(true)} />

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
                      <div className="text-xs text-slate-400">{it.variantLabel}</div>
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

      <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200 transition-colors">
              Inicio
            </Link>
            <span>›</span>
            <span className="text-slate-200">{item.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Columna izquierda - Imagen y características */}
            <div className="space-y-6">
              {/* Imagen principal */}
              <div className="group relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
                <img
                  src={item.imageBase64 || "/placeholder-product.svg"}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {availableStock <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <span className="rounded-full bg-rose-500 px-6 py-3 text-lg font-bold text-white">
                      AGOTADO
                    </span>
                  </div>
                )}
              </div>
              {item.features && item.features.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="border-b border-white/10 bg-white/5 px-5 py-3">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                      <svg
                        className="h-5 w-5 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Características del Producto
                    </h3>
                  </div>
                  <div className="divide-y divide-white/10">
                    {item.features.map((f, idx) => (
                      <div
                        key={f.id}
                        className={`flex items-center justify-between px-5 py-3 ${
                          idx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-400">
                          {f.name}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columna derecha - Información y compra */}
            <div className="space-y-6">
              {/* Header del producto */}
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">
                  {item.name}
                </h1>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-emerald-400">
                    S/ {unitPrice.toFixed(2)}
                  </span>
                  {currentVariant?.price &&
                    currentVariant.price !== item.price && (
                      <span className="text-lg text-slate-400 line-through">
                        S/ {item.price.toFixed(2)}
                      </span>
                    )}
                </div>
              </div>

              {/* Panel de selección */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-sm">
                {item.options?.length ? (
                  <div className="space-y-4">
                    {item.options.map((op) => {
                      // Verificar si esta opción tiene colores
                      const hasColors = op.values.some((v) => v.hexColor);

                      // Verificar disponibilidad de cada valor
                      const valuesWithAvailability = op.values.map((val) => {
                        // Para colores: disponible si tiene stock en CUALQUIER combinación
                        // Para otras opciones: disponible según las selecciones actuales
                        const hasStock = item.variants.some((variant) => {
                          if (variant.stock <= 0) return false;
                          const variantValueIds = new Set(
                            variant.values.map((v) => v.valueId)
                          );

                          // Debe tener este valor
                          if (!variantValueIds.has(val.id)) return false;

                          // Si es un color (primera opción o tiene hexColor), siempre disponible si tiene stock
                          if (hasColors) return true;

                          // Para otras opciones (tallas, etc), verificar compatibilidad con selecciones
                          return Object.entries(selected).every(
                            ([optId, valId]) => {
                              const optionIdNum = Number(optId);
                              // Ignorar la opción actual
                              if (optionIdNum === op.id) return true;
                              // Para otras opciones, verificar que el valor seleccionado esté en esta variante
                              return variantValueIds.has(Number(valId));
                            }
                          );
                        });

                        return { ...val, hasStock };
                      });

                      return (
                        <div key={op.id}>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            {op.name}
                          </label>

                          {hasColors ? (
                            // Mostrar colores como cuadritos
                            <div className="flex flex-wrap gap-3">
                              {valuesWithAvailability.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex flex-col items-center gap-1"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!v.hasStock) return;
                                      const newSelected = {
                                        ...selected,
                                        [op.id]: v.id,
                                      };
                                      // Auto-seleccionar opciones compatibles
                                      const finalSelected =
                                        autoSelectCompatibleOptions(
                                          newSelected,
                                          item.options,
                                          item.variants
                                        );
                                      setSelected(finalSelected);
                                    }}
                                    disabled={!v.hasStock}
                                    className={`relative overflow-hidden rounded-lg border-2 p-0 transition-all ${
                                      selected[op.id] === v.id
                                        ? "border-emerald-500 ring-2 ring-emerald-500/50 scale-110"
                                        : v.hasStock
                                        ? "border-white/20 hover:border-white/40 hover:scale-105"
                                        : "border-white/10 opacity-40 cursor-not-allowed"
                                    }`}
                                    title={`${v.value}${
                                      !v.hasStock ? " (Sin stock)" : ""
                                    }`}
                                  >
                                    <div
                                      className="flex h-12 w-12 items-center justify-center"
                                      style={{
                                        backgroundColor: normalizeHexColor(
                                          v.hexColor
                                        ),
                                      }}
                                    >
                                      {selected[op.id] === v.id && (
                                        <svg
                                          className="h-6 w-6 text-white drop-shadow-lg"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  </button>
                                  <span className="text-xs text-slate-400">
                                    {v.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Mostrar como botones de texto para tallas u otras opciones
                            <div className="flex flex-wrap gap-2">
                              {valuesWithAvailability.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    if (!v.hasStock) return;
                                    const newSelected = {
                                      ...selected,
                                      [op.id]: v.id,
                                    };
                                    // Auto-seleccionar opciones compatibles
                                    const finalSelected =
                                      autoSelectCompatibleOptions(
                                        newSelected,
                                        item.options,
                                        item.variants
                                      );
                                    setSelected(finalSelected);
                                  }}
                                  disabled={!v.hasStock}
                                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                                    selected[op.id] === v.id
                                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-100"
                                      : v.hasStock
                                      ? "border-white/20 bg-white/5 text-slate-200 hover:border-white/40 hover:bg-white/10"
                                      : "border-white/10 bg-white/5 text-slate-400 opacity-50 cursor-not-allowed line-through"
                                  }`}
                                >
                                  {v.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mb-2 text-sm text-slate-400">
                    Este producto no tiene variantes.
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg
                      className="h-5 w-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      Stock disponible:{" "}
                      <span className="font-semibold text-emerald-400">
                        {availableStock} unidades
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span className="font-medium">Pago 100% Seguro</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg
                      className="h-5 w-5 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    <span>
                      Envíos a todo el Perú{" "}
                      <span className="text-purple-400 font-medium">
                        (Aprox 1-4 Días Hábiles)
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-white/10 bg-white/5">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-4 py-3 text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={availableStock || undefined}
                      value={qty}
                      onChange={(e) =>
                        setQty(
                          Math.max(
                            1,
                            Math.min(
                              Number(e.target.value || 1),
                              availableStock || Infinity
                            )
                          )
                        )
                      }
                      className="w-16 border-none bg-transparent px-2 py-3 text-center text-slate-100 outline-none"
                    />
                    <button
                      onClick={() =>
                        setQty(Math.min(availableStock || Infinity, qty + 1))
                      }
                      className="px-4 py-3 text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    disabled={(availableStock || 0) <= 0}
                    onClick={addToCart}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-lg font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {(availableStock || 0) <= 0
                      ? "Agotado"
                      : "Añadir al carrito"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
