"use client";

import { useState } from "react";

type CreateInput = {
  name: string;
  price: number;
  entryDate?: string;
  imageBase64?: string;
};

interface ProductFormProps {
  onSubmit: (form: CreateInput, resetForm: () => void) => Promise<void>;
  saving: boolean;
}

export default function ProductForm({ onSubmit, saving }: ProductFormProps) {
  const [form, setForm] = useState<CreateInput>({
    name: "",
    price: 0,
    entryDate: "",
    imageBase64: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const canSubmit = form.name.trim() && form.price >= 0;

  function handleFile(file: File | null) {
    if (!file) {
      setForm((f) => ({ ...f, imageBase64: "" }));
      setImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setForm((f) => ({ ...f, imageBase64: result }));
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setForm({
      name: "",
      price: 0,
      entryDate: "",
      imageBase64: "",
    });
    setImagePreview(null);
  }

  async function handleSubmit() {
    await onSubmit(form, resetForm);
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-4 text-lg font-medium">Nuevo Producto</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Nombre
          </label>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Polo Classic"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Precio Base
          </label>
          <input
            type="number"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Fecha de Ingreso
          </label>
          <input
            type="date"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 outline-none ring-brand-500/30 focus:ring-4"
            value={form.entryDate}
            onChange={(e) =>
              setForm({ ...form, entryDate: e.target.value })
            }
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm text-slate-300">
            Imagen
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 file:mr-3 file:rounded-lg file:border file:border-white/10 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-200 hover:file:bg-white/20"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/10"
              />
            )}
          </div>
        </div>
        <div className="flex items-end">
          <button
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-glow hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Creando…" : "Crear Producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
