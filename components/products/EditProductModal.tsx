"use client";

import { useState, useEffect } from "react";

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

interface EditProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (id: number, data: { name: string; price: number; imageBase64?: string }) => Promise<void>;
  saving: boolean;
}

export default function EditProductModal({
  product,
  onClose,
  onSave,
  saving,
}: EditProductModalProps) {
  const [form, setForm] = useState({ name: "", price: 0, imageBase64: "" });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setForm({ name: product.name, price: product.price, imageBase64: "" });
      setPreviewImage(product.image || null);
    }
  }, [product]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setForm(prev => ({ ...prev, imageBase64: base64 }));
      setPreviewImage(base64);
    };
    reader.readAsDataURL(file);
  }

  if (!product) return null;

  async function handleSave() {
    if (!product?.id) return;
    await onSave(product.id, form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-slate-950/95 p-6">
        <h3 className="mb-4 text-lg font-semibold">Editar Producto</h3>

        <div className="mb-3">
          <label className="mb-2 block text-sm text-slate-300">Nombre</label>
          <input
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm text-slate-300">
            Precio Base
          </label>
          <input
            type="number"
            value={form.price}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                price: Number(e.target.value),
              }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm text-slate-300">Imagen</label>
          {previewImage && (
            <div className="mb-2 relative aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-white/10">
              <img
                src={previewImage}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-emerald-600 file:px-3 file:py-1 file:text-sm file:text-white hover:file:bg-emerald-500"
          />
          <p className="mt-1 text-xs text-slate-400">Deja vacío para mantener la imagen actual</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
