"use client"

export default function ScreenLoader({ active, message = "Cargando..." }: { active: boolean; message?: string }) {
  if (!active) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100 shadow-2xl">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  )
}
