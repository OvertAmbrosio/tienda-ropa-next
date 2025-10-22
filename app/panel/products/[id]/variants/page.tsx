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

type ProductOption = {
  id: number;
  name: string;
  position: number;
  values: Array<{
    id: number;
    value: string;
    hexColor?: string | null;
  }>;
};

type ProductVariant = {
  id: number;
  sku: string;
  price: number | null;
  stock: number;
  isActive: boolean;
  optionKey: string;
  values: Array<{
    optionId: number;
    optionName: string;
    optionPosition: number;
    valueId: number;
    value: string;
    hexColor?: string | null;
  }>;
};

export default function VariantsManagementPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Opciones y valores
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [newOption, setNewOption] = useState({ name: "", position: 0 });
  const [newValues, setNewValues] = useState<Record<number, { value: string; hexColor?: string }>>({});
  
  // Variantes
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariant, setNewVariant] = useState({
    sku: "",
    stock: "",
    selectedValues: {} as Record<number, number>
  });
  
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ stock: "", isActive: true });
  
  // Estado para editar opciones
  const [editingOption, setEditingOption] = useState<number | null>(null);
  const [editOptionForm, setEditOptionForm] = useState({ name: "", position: 0 });
  
  // Estado para editar valores
  const [editingValue, setEditingValue] = useState<number | null>(null);
  const [editValueForm, setEditValueForm] = useState({ value: "", hexColor: "" });

  async function fetchProductData() {
    setLoading(true);
    try {
      const [prodRes, optRes, varRes] = await Promise.all([
        fetch(`/api/products/${productId}`, { cache: "no-store" }),
        fetch(`/api/products/${productId}/options`, { cache: "no-store" }),
        fetch(`/api/products/${productId}/variants`, { cache: "no-store" })
      ]);
      
      const [prodData, optData, varData] = await Promise.all([
        prodRes.json(),
        optRes.json(),
        varRes.json()
      ]);
      
      if (!prodRes.ok) throw new Error(prodData?.message || "Error al cargar producto");
      if (!optRes.ok) throw new Error(optData?.message || "Error al cargar opciones");
      if (!varRes.ok) throw new Error(varData?.message || "Error al cargar variantes");
      
      setProduct(prodData.item || null);
      setOptions((optData.items || []) as ProductOption[]);
      setVariants((varData.items || []) as ProductVariant[]);
    } catch (e: any) {
      toast.error(e?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (productId) fetchProductData();
  }, [productId]);

  // Opciones
  async function createOption() {
    if (!newOption.name.trim()) return;
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOption)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al crear opción');
        return true;
      },
      successMessage: 'Opción creada',
      onSuccess: () => {
        setNewOption({ name: "", position: 0 });
        fetchProductData();
      }
    });
  }

  async function updateOption(optionId: number) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/options/${optionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editOptionForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al actualizar opción');
        return true;
      },
      successMessage: 'Opción actualizada',
      onSuccess: () => {
        setEditingOption(null);
        fetchProductData();
      }
    });
  }

  async function deleteOption(optionId: number) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/options/${optionId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al eliminar opción');
        return true;
      },
      successMessage: 'Opción eliminada',
      onSuccess: fetchProductData
    });
  }

  async function updateValue(optionId: number, valueId: number) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/options/${optionId}/values/${valueId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editValueForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al actualizar valor');
        return true;
      },
      successMessage: 'Valor actualizado',
      onSuccess: () => {
        setEditingValue(null);
        fetchProductData();
      }
    });
  }

  async function deleteValue(optionId: number, valueId: number) {
    if (!confirm('¿Eliminar este valor?')) return;
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/options/${optionId}/values/${valueId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al eliminar valor');
        return true;
      },
      successMessage: 'Valor eliminado',
      onSuccess: fetchProductData
    });
  }

  async function addValue(optionId: number) {
    const value = newValues[optionId];
    if (!value?.value?.trim()) return;
    
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/options/${optionId}/values`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: value.value, hexColor: value.hexColor || null })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al agregar valor');
        return true;
      },
      successMessage: 'Valor agregado',
      onSuccess: () => {
        setNewValues(prev => ({ ...prev, [optionId]: { value: "", hexColor: "" } }));
        fetchProductData();
      }
    });
  }

  // Variantes
  function canCreateVariant() {
    if (!newVariant.stock || Number(newVariant.stock) <= 0) return false;
    
    // Debe seleccionar un valor para cada opción
    for (const opt of options) {
      if (!newVariant.selectedValues[opt.id]) return false;
    }
    return true;
  }

  async function createVariant() {
    if (!canCreateVariant()) return;
    
    const valueIds = Object.values(newVariant.selectedValues).filter(Boolean) as number[];
    const stock = Number(newVariant.stock);
    
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: newVariant.sku || undefined,
            stock,
            isActive: true,
            valueIds
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al crear variante');
        return true;
      },
      successMessage: 'Variante creada',
      onSuccess: () => {
        setNewVariant({ sku: "", stock: "", selectedValues: {} });
        fetchProductData();
      }
    });
  }

  async function updateVariant(variantId: number) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/variants/${variantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock: Number(editForm.stock),
            isActive: editForm.isActive
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al actualizar variante');
        return true;
      },
      successMessage: 'Variante actualizada',
      onSuccess: () => {
        setEditingVariant(null);
        fetchProductData();
      }
    });
  }

  async function deleteVariant(variantId: number) {
    await runUiAction({
      setLoading: setSaving,
      action: async () => {
        const res = await fetch(`/api/products/${productId}/variants/${variantId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Error al eliminar variante');
        return true;
      },
      successMessage: 'Variante eliminada',
      onSuccess: fetchProductData
    });
  }

  function getVariantLabel(variant: ProductVariant) {
    if (variant.optionKey === 'DEFAULT') return 'Variante base';
    return variant.values
      .sort((a, b) => a.optionPosition - b.optionPosition)
      .map(v => v.value)
      .join(' / ');
  }

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
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Variantes</h1>
            {product && (
              <p className="mt-1 text-slate-400">Producto: {product.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/panel/products" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
              Volver a productos
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Panel de Opciones */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Opciones del Producto</h2>
            
            <div className="mb-4 grid gap-2 md:grid-cols-3">
              <input
                placeholder="Nombre (ej: Color, Talla)"
                value={newOption.name}
                onChange={(e) => setNewOption(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none md:col-span-2"
              />
              <button
                onClick={createOption}
                disabled={saving || !newOption.name.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Agregar Opción
              </button>
            </div>

            <div className="space-y-4">
              {options.map(option => (
                <div key={option.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    {editingOption === option.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          value={editOptionForm.name}
                          onChange={(e) => setEditOptionForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nombre"
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100 outline-none"
                        />
                        <input
                          type="number"
                          value={editOptionForm.position}
                          onChange={(e) => setEditOptionForm(prev => ({ ...prev, position: Number(e.target.value) }))}
                          placeholder="Pos"
                          className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-100 outline-none"
                        />
                        <button
                          onClick={() => updateOption(option.id)}
                          disabled={saving || !editOptionForm.name.trim()}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingOption(null)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-slate-100">{option.name} <span className="text-xs text-slate-400">(pos: {option.position})</span></h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingOption(option.id);
                              setEditOptionForm({ name: option.name, position: option.position });
                            }}
                            disabled={saving}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteOption(option.id)}
                            disabled={saving}
                            className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-100 hover:bg-rose-500/20"
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="mb-2 flex flex-wrap gap-2">
                    {option.values.map(val => (
                      editingValue === val.id ? (
                        <div key={val.id} className="flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-1">
                          <input
                            value={editValueForm.value}
                            onChange={(e) => setEditValueForm(prev => ({ ...prev, value: e.target.value }))}
                            placeholder="Valor"
                            className="w-20 rounded border-none bg-transparent px-1 text-xs text-slate-100 outline-none"
                          />
                          {option.name.toLowerCase().includes('color') && (
                            <input
                              value={editValueForm.hexColor}
                              onChange={(e) => setEditValueForm(prev => ({ ...prev, hexColor: e.target.value }))}
                              placeholder="#hex"
                              className="w-16 rounded border-none bg-transparent px-1 text-xs text-slate-100 outline-none"
                            />
                          )}
                          <button
                            onClick={() => updateValue(option.id, val.id)}
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Guardar"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingValue(null)}
                            className="text-slate-400 hover:text-slate-300"
                            title="Cancelar"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span key={val.id} className="group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200">
                          {val.value}
                          {val.hexColor && (
                            <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: val.hexColor }} />
                          )}
                          <button
                            onClick={() => {
                              setEditingValue(val.id);
                              setEditValueForm({ value: val.value, hexColor: val.hexColor || '' });
                            }}
                            className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-emerald-400"
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteValue(option.id, val.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </span>
                      )
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      placeholder="Nuevo valor"
                      value={newValues[option.id]?.value || ''}
                      onChange={(e) => setNewValues(prev => ({
                        ...prev,
                        [option.id]: { ...prev[option.id], value: e.target.value }
                      }))}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none"
                    />
                    {option.name.toLowerCase().includes('color') && (
                      <input
                        placeholder="#hex"
                        value={newValues[option.id]?.hexColor || ''}
                        onChange={(e) => setNewValues(prev => ({
                          ...prev,
                          [option.id]: { ...prev[option.id], hexColor: e.target.value }
                        }))}
                        className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none"
                      />
                    )}
                    <button
                      onClick={() => addValue(option.id)}
                      disabled={saving || !(newValues[option.id]?.value || '').trim()}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/20 disabled:opacity-50"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Panel de Variantes */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Variantes</h2>
            
            <div className="mb-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  placeholder="SKU (opcional)"
                  value={newVariant.sku}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <input
                  type="number"
                  placeholder="Stock inicial"
                  value={newVariant.stock}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, stock: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>
              
              <div className="grid gap-2 md:grid-cols-2">
                {options.map(option => (
                  <div key={option.id}>
                    <label className="mb-1 block text-xs text-slate-400">{option.name}</label>
                    <select
                      value={newVariant.selectedValues[option.id] || ''}
                      onChange={(e) => setNewVariant(prev => ({
                        ...prev,
                        selectedValues: {
                          ...prev.selectedValues,
                          [option.id]: Number(e.target.value)
                        }
                      }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {option.values.map(val => (
                        <option key={val.id} value={val.id}>{val.value}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              
              <button
                onClick={createVariant}
                disabled={saving || !canCreateVariant()}
                className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Crear Variante
              </button>
            </div>

            <div className="space-y-2">
              {variants.map(variant => (
                <div key={variant.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  {editingVariant === variant.id ? (
                    <>
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          type="number"
                          placeholder="Stock"
                          value={editForm.stock}
                          onChange={(e) => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          />
                          Activo
                        </label>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => updateVariant(variant.id)}
                          disabled={saving}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingVariant(null)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">
                          {getVariantLabel(variant)}
                        </div>
                        <div className="text-xs text-slate-400">
                          SKU: {variant.sku} | 
                          Stock: {variant.stock}
                          {!variant.isActive && <span className="ml-2 text-amber-400"> | Inactivo</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingVariant(variant.id);
                            setEditForm({
                              stock: variant.stock.toString(),
                              isActive: variant.isActive
                            });
                          }}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteVariant(variant.id)}
                          disabled={saving}
                          className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-100 hover:bg-rose-500/20"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ScreenLoader active={loading} message="Cargando variantes..." />
    </main>
  );
}
