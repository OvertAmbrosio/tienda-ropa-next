"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { runUiAction } from "@/lib/ui-action";
import ScreenLoader from "@/components/ScreenLoader";
import Link from "next/link";

type ProductWithVariants = {
  id: number;
  name: string;
  price: number;
  stock: number;
  image?: string | null;
  variants: Array<{
    id: number;
    sku: string;
    price: number | null;
    stock: number;
    isActive: boolean;
    optionKey: string;
    values: Array<{
      optionName: string;
      value: string;
      hexColor?: string | null;
    }>;
  }>;
};

export default function StockManagementPage() {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [stockAdjustments, setStockAdjustments] = useState<Record<number, number>>({});
  const [adjustingStock, setAdjustingStock] = useState(false);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products?includeVariants=true", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error al cargar productos");
      setProducts(data.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.variants.some(v => v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  async function adjustStock(variantId: number, newStock: number) {
    if (!selectedProduct) return;
    await runUiAction({
      setLoading: setAdjustingStock,
      action: async () => {
        const res = await fetch(`/api/products/${selectedProduct.id}/variants/${variantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: newStock })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al actualizar stock');
        return true;
      },
      successMessage: 'Stock actualizado',
      onSuccess: () => {
        fetchProducts();
        setStockAdjustments({});
      }
    });
  }

  function getVariantLabel(variant: any) {
    if (variant.optionKey === 'DEFAULT') return 'Variante base';
    return variant.values.map((v: any) => `${v.optionName}: ${v.value}`).join(', ');
  }

  const totalStock = (product: ProductWithVariants) => 
    product.variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gestión de Stock</h1>
          <div className="flex items-center gap-3">
            <button onClick={fetchProducts} disabled={loading} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60">
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
            <Link href="/panel/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
              Volver al dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar producto o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-100">{product.name}</h3>
                  <p className="text-sm text-slate-400">Stock total: {totalStock(product)} unidades</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                >
                  Gestionar
                </button>
              </div>
              
              <div className="space-y-2">
                {product.variants.slice(0, 3).map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2 text-sm">
                    <div>
                      <div className="text-slate-200">{getVariantLabel(variant)}</div>
                      <div className="text-xs text-slate-400">SKU: {variant.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-100">{variant.stock} unidades</div>
                      {!variant.isActive && <span className="text-xs text-amber-400">Inactivo</span>}
                    </div>
                  </div>
                ))}
                {product.variants.length > 3 && (
                  <div className="text-center text-xs text-slate-400">
                    +{product.variants.length - 3} variantes más
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
            No se encontraron productos
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedProduct(null)} />
          <div className="relative z-10 mx-auto my-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/95 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Gestionar stock: {selectedProduct.name}
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              {selectedProduct.variants.map((variant) => (
                <div key={variant.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-100">{getVariantLabel(variant)}</div>
                      <div className="text-sm text-slate-400">SKU: {variant.sku}</div>
                      {variant.price !== null && (
                        <div className="text-sm text-slate-400">
                          Precio: S/ {variant.price.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-100">{variant.stock}</div>
                      <div className="text-xs text-slate-400">unidades</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Nuevo stock"
                      value={stockAdjustments[variant.id] ?? ''}
                      onChange={(e) => setStockAdjustments(prev => ({
                        ...prev,
                        [variant.id]: Number(e.target.value)
                      }))}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                    <button
                      onClick={() => adjustStock(variant.id, stockAdjustments[variant.id])}
                      disabled={adjustingStock || stockAdjustments[variant.id] === undefined}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ScreenLoader active={loading} message="Cargando stock..." />
    </main>
  );
}
