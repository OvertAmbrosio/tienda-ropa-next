"use client";

import Link from "next/link";

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

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-slate-100">
            {product.name}
          </h3>
          <p className="text-sm text-slate-400">ID: #{product.id}</p>
        </div>
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        )}
      </div>

      <div className="mb-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Precio base:</span>
          <span className="text-slate-200">
            S/ {product.price.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Stock total:</span>
          <span className="text-slate-200">
            {product.stock} unidades
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Variantes:</span>
          <span className="text-slate-200">
            {product._count?.variants || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Características:</span>
          <span className="text-slate-200">
            {product._count?.features || 0}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link
          href={`/panel/products/${product.id}/variants`}
          className="rounded-lg bg-blue-600/10 px-3 py-2 text-center text-blue-100 hover:bg-blue-600/20"
        >
          Variantes
        </Link>
        <Link
          href={`/panel/products/${product.id}/features`}
          className="rounded-lg bg-purple-600/10 px-3 py-2 text-center text-purple-100 hover:bg-purple-600/20"
        >
          Características
        </Link>
        <button
          onClick={() => onEdit(product)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:bg-white/10"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-rose-100 hover:bg-rose-500/20"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
