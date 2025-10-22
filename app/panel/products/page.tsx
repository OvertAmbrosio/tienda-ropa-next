"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { runUiAction } from "@/lib/ui-action";
import ScreenLoader from "@/components/ScreenLoader";
import ProductsHeader from "@/components/products/ProductsHeader";
import ProductForm from "@/components/products/ProductForm";
import ProductCard from "@/components/products/ProductCard";
import EditProductModal from "@/components/products/EditProductModal";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  entryDate: string;
  image?: string | null;
  _count?: {
    variants?: number;
    features?: number;
  };
};

type ListResponse = { items: Product[] };
type CreateInput = {
  name: string;
  price: number;
  entryDate?: string;
  imageBase64?: string;
};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/products?includeCounts=true", {
        cache: "no-store",
      });
      const data = (await res.json()) as ListResponse;
      if (!res.ok) throw new Error("Error al cargar productos");
      setItems(data.items);
    } catch (e: any) {
      toast.error(e?.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function onCreate(form: CreateInput, resetForm: () => void) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "No se pudo crear");
        return data.item as Product;
      },
      successMessage: "Producto creado exitosamente",
      onSuccess: (item) => {
        setItems((prev) => [item, ...prev]);
        resetForm();
      },
    });
  }

  async function onUpdate(id: number, data: { name: string; price: number; imageBase64?: string }) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        // Solo enviar imageBase64 si se proporcionó una nueva imagen
        const payload: any = { name: data.name, price: data.price };
        if (data.imageBase64) {
          payload.imageBase64 = data.imageBase64;
        }
        const res = await fetch(`/api/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.message || "No se pudo actualizar");
        return result.item as Product;
      },
      successMessage: "Producto actualizado",
      onSuccess: (updated) => {
        setItems((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        setEditingProduct(null);
      },
    });
  }

  async function onDelete(id: number) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    await runUiAction({
      action: async () => {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "No se pudo eliminar");
        return true;
      },
      successMessage: "Producto eliminado",
      onSuccess: () => setItems((prev) => prev.filter((p) => p.id !== id)),
    });
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl">
        <ProductsHeader onRefresh={fetchItems} loading={loading} />
        
        <ProductForm onSubmit={onCreate} saving={saving} />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">Productos Existentes</h2>
          
          {items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={setEditingProduct}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            !loading && (
              <div className="py-12 text-center text-slate-400">
                No hay productos registrados. Crea tu primer producto usando el
                formulario superior.
              </div>
            )
          )}
        </div>
      </div>

      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={onUpdate}
        saving={saving}
      />

      <ScreenLoader active={loading} message="Cargando productos..." />
    </main>
  );
}
