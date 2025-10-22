"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import ScreenLoader from "@/components/ScreenLoader";
import { runUiAction } from "@/lib/ui-action";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    await runUiAction({
      setLoading,
      action: () => api.login(username, password),
      successMessage: (res) => `Bienvenido ${res.user.name ?? res.user.email}`,
      errorMessage: (err) => err.message || "Error al iniciar sesión",
      onSuccess: (res) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(res.user));
        }
        setNavigating(true);
        router.push("/panel/dashboard");
      },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 relative">
      <ScreenLoader active={navigating} message="Ingresando..." />
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      <div>
        <label className="mb-2 block text-sm text-slate-300">Usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="tu@email.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none ring-brand-500/30 focus:ring-4"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none ring-brand-500/30 focus:ring-4"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white shadow-glow transition-all hover:brightness-110 disabled:opacity-60"
      >
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-600 to-brand-500 opacity-0 transition-opacity group-hover:opacity-100" />
        {loading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
