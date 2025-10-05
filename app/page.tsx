import Image from 'next/image'
import Link from 'next/link'
import LoginForm from '@/components/LoginForm'

export default function Page() {
  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <section className="relative hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/40 via-brand-500/30 to-brand-400/20" />
        <Image
          src="/hero-fashion.jpg"
          alt="Moda"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
        <div className="absolute bottom-8 left-8 right-8 text-white drop-shadow-lg">
          <h1 className="text-3xl font-semibold">Tienda de Ropa</h1>
          <p className="mt-2 max-w-md text-white/90">
            Plataforma administrativa moderna para tu ecommerce de moda.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 shadow-glow" />
            <div>
              <h2 className="text-xl font-semibold">Panel de Administración</h2>
              <p className="text-sm text-slate-400">Inicia sesión para continuar</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            ¿Olvidaste tu contraseña?{' '}
            <Link href="#" className="text-brand-400 hover:text-brand-300">Recupérala</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
