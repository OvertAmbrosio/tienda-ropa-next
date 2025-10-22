"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { runUiAction } from "@/lib/ui-action";
import ScreenLoader from "@/components/ScreenLoader";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  image?: string | null;
};

type ProductFeature = { 
  id: number; 
  name: string; 
  value: string; 
};

export default function ProductFeaturesPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newFeature, setNewFeature] = useState({ name: "", value: "" });
  const [editingFeature, setEditingFeature] = useState<ProductFeature | null>(null);
  const [editForm, setEditForm] = useState({ name: "", value: "" });

  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, featRes] = await Promise.all([
        fetch(`/api/products/${productId}`, { cache: "no-store" }),
        fetch(`/api/products/${productId}/features`, { cache: "no-store" })
      ]);
      
      const [prodData, featData] = await Promise.all([
        prodRes.json(),
        featRes.json()
      ]);
      
      if (!prodRes.ok) throw new Error(prodData?.message || "Error al cargar producto");
      if (!featRes.ok) throw new Error(featData?.message || "Error al cargar características");
      
      setProduct(prodData.item || null);
      setFeatures((featData.items || []) as ProductFeature[]);
    } catch (e: any) {
      toast.error(e?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (productId) fetchData();
  }, [productId]);

  async function addFeature() {
    if (!newFeature.name.trim() || !newFeature.value.trim()) return;
    
    await runUiAction({ 
      setLoading: setSaving, 
      action: async () => { 
        const res = await fetch(`/api/products/${productId}/features`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            name: newFeature.name.trim(), 
            value: newFeature.value.trim() 
          }) 
        }); 
        const data = await res.json(); 
        if (!res.ok) throw new Error(data?.message || 'No se pudo agregar característica'); 
        return true; 
      }, 
      successMessage: 'Característica agregada', 
      onSuccess: () => { 
        setNewFeature({ name: '', value: '' }); 
        fetchData(); 
      } 
    });
  }

  async function updateFeature(featureId: number) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/features/${featureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al actualizar característica');
        return true;
      },
      successMessage: 'Característica actualizada',
      onSuccess: () => {
        setEditingFeature(null);
        fetchData();
      }
    });
  }

  async function deleteFeature(featureId: number) {
    if (!confirm('¿Estás seguro de eliminar esta característica?')) return;
    
    await runUiAction({ 
      setLoading: setSaving, 
      action: async () => { 
        const res = await fetch(`/api/products/${productId}/features/${featureId}`, { 
          method: 'DELETE' 
        }); 
        const data = await res.json().catch(() => ({})); 
        if (!res.ok) throw new Error(data?.message || 'No se pudo eliminar característica'); 
        return true; 
      }, 
      successMessage: 'Característica eliminada', 
      onSuccess: () => { 
        fetchData(); 
      } 
    });
  }

  // Categorías sugeridas para características
  const suggestions = [
    { name: "Material", values: ["Algodón", "Poliéster", "Lana", "Seda", "Lino"] },
    { name: "Origen", values: ["Nacional", "Importado"] },
    { name: "Temporada", values: ["Verano", "Invierno", "Primavera", "Otoño", "Todo el año"] },
    { name: "Estilo", values: ["Casual", "Formal", "Deportivo", "Elegante"] },
    { name: "Cuidados", values: ["Lavado a máquina", "Lavado a mano", "Lavado en seco"] }
  ];

  if (!product && !loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-slate-400">Producto no encontrado</p>
          <Link href="/panel/products" className="mt-4 inline-block rounded-lg bg-white/10 px-4 py-2 text-slate-200 hover:bg-white/20">
            Volver a productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Características del Producto</h1>
            {product && (
              <p className="mt-1 text-slate-400">Producto: {product.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/panel/products/${productId}/variants`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500">
              Gestionar Variantes
            </Link>
            <Link href="/panel/products" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
              Volver a productos
            </Link>
          </div>
        </div>

        {/* Agregar nueva característica */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">Agregar Característica</h2>
          
          {/* Sugerencias */}
          <div className="mb-4">
            <p className="mb-2 text-sm text-slate-400">Sugerencias rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.name}
                  onClick={() => setNewFeature(prev => ({ ...prev, name: suggestion.name }))}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              placeholder="Nombre (ej: Material)"
              value={newFeature.name}
              onChange={(e) => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none"
            />
            <input
              placeholder="Valor (ej: Algodón 100%)"
              value={newFeature.value}
              onChange={(e) => setNewFeature(prev => ({ ...prev, value: e.target.value }))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none"
            />
            <button
              onClick={addFeature}
              disabled={saving || !newFeature.name.trim() || !newFeature.value.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {/* Valores sugeridos basados en el nombre */}
          {newFeature.name && suggestions.find(s => s.name === newFeature.name) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions
                .find(s => s.name === newFeature.name)
                ?.values.map(value => (
                  <button
                    key={value}
                    onClick={() => setNewFeature(prev => ({ ...prev, value }))}
                    className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/20"
                  >
                    {value}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Lista de características */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-medium">
            Características ({features.length})
          </h2>
          
          <div className="grid gap-3 md:grid-cols-2">
            {features.map((feature) => (
              editingFeature?.id === feature.id ? (
                <div key={feature.id} className="rounded-lg border border-emerald-400/20 bg-white/5 p-4">
                  <div className="mb-3 grid gap-2">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                      placeholder="Nombre"
                    />
                    <input
                      value={editForm.value}
                      onChange={(e) => setEditForm(prev => ({ ...prev, value: e.target.value }))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                      placeholder="Valor"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFeature(feature.id)}
                      disabled={saving || !editForm.name.trim() || !editForm.value.trim()}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingFeature(null)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div key={feature.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="mb-2">
                    <div className="text-sm font-medium text-slate-300">{feature.name}</div>
                    <div className="text-base text-slate-100">{feature.value}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingFeature(feature);
                        setEditForm({ name: feature.name, value: feature.value });
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteFeature(feature.id)}
                      disabled={saving}
                      className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 hover:bg-rose-500/20"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>

          {features.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              No hay características registradas. Agrega las primeras usando el formulario superior.
            </div>
          )}
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando características..." />
    </main>
  );
}
