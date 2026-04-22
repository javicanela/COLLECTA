import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export default function LoginView() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login('admin', 'Collecta2025!');
    if (!ok) {
      setError('Error de conexión. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0b0a1d] text-white font-sans">
      {/* ═══════════ LEFT PANEL — Metrics ═══════════ */}
      <aside className="hidden md:flex flex-1 bg-white text-slate-900 relative p-8 lg:p-10 flex-col">
        <div className="grid grid-cols-3 grid-rows-3 gap-4 lg:gap-5 flex-1 auto-rows-fr">
          {/* 1. RECUPERACIÓN RÁPIDA */}
          <MetricCard
            borderClass="border-blue-400/60"
            className="col-span-1 row-span-1"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-[11px] lg:text-xs font-bold tracking-widest text-slate-800 leading-tight uppercase">
                RECUPERACIÓN<br />RÁPIDA
              </h3>
              <SafeIcon className="text-slate-700 shrink-0" />
            </div>
            <div className="mt-4 flex-1 flex flex-col justify-end">
              <div className="text-5xl lg:text-6xl font-bold tracking-tight text-[#0d2650] leading-none">94%</div>
              <p className="mt-2 text-sm text-slate-600">Incrementa tu<br />efectividad.</p>
            </div>
          </MetricCard>

          {/* 2. AVANCE MENSUAL (dark card with chart) */}
          <div className="col-span-1 row-span-1 rounded-2xl bg-[#0d0c1f] text-white p-5 flex flex-col border border-white/10 shadow-lg">
            <h3 className="text-center text-xs lg:text-sm font-extrabold tracking-wider uppercase leading-tight">
              AVANCE<br />MENSUAL
            </h3>
            <div className="flex-1 mt-3 flex items-end">
              <MiniBarChart />
            </div>
          </div>

          {/* 3. REDUCCIÓN DE DEUDA */}
          <MetricCard borderClass="border-fuchsia-300/60">
            <div className="flex items-start justify-between">
              <h3 className="text-[11px] lg:text-xs font-bold tracking-widest text-slate-800 leading-tight uppercase">
                REDUCCIÓN<br />DE DEUDA
              </h3>
              <TrendDownIcon className="text-fuchsia-500 shrink-0" />
            </div>
            <div className="mt-4 flex-1 flex flex-col justify-end">
              <div className="text-5xl lg:text-6xl font-bold tracking-tight text-[#0d2650] leading-none">-38%</div>
              <p className="mt-2 text-sm text-slate-600">Minimiza la<br />cartera vencida.</p>
            </div>
          </MetricCard>

          {/* 4. GESTIÓN EFICIENTE (wide) */}
          <MetricCard borderClass="border-teal-500/50" className="col-span-2">
            <div className="flex items-start justify-between">
              <h3 className="text-[11px] lg:text-xs font-bold tracking-widest text-slate-800 leading-tight uppercase">
                GESTIÓN<br />EFICIENTE
              </h3>
              <ClockGearIcon className="text-teal-600 shrink-0" />
            </div>
            <div className="mt-4 flex-1 flex flex-col justify-end">
              <div className="text-5xl lg:text-6xl font-bold tracking-tight text-teal-700 leading-none">20h</div>
              <p className="mt-2 text-sm text-slate-600">Ahorra 20h a la semana.</p>
            </div>
          </MetricCard>

          {/* 5. MAYOR INTERACCIÓN */}
          <MetricCard borderClass="border-emerald-500/60">
            <div className="flex items-start justify-between">
              <h3 className="text-[11px] lg:text-xs font-bold tracking-widest text-slate-800 leading-tight uppercase">
                MAYOR<br />INTERACCIÓN
              </h3>
              <ChatRocketIcon className="text-emerald-600 shrink-0" />
            </div>
            <div className="mt-4 flex-1 flex flex-col justify-end">
              <div className="text-5xl lg:text-6xl font-bold tracking-tight text-emerald-600 leading-none">3x</div>
              <p className="mt-2 text-sm text-slate-600">3x más<br />respuestas.</p>
            </div>
          </MetricCard>

          {/* 6. REPORTES AGILIZADOS */}
          <MetricCard borderClass="border-orange-400/60">
            <div className="flex items-start justify-between">
              <h3 className="text-[11px] lg:text-xs font-bold tracking-widest text-orange-700 leading-tight uppercase">
                REPORTES<br />AGILIZADOS
              </h3>
              <ScrollIcon className="text-orange-600 shrink-0" />
            </div>
            <div className="mt-4 flex-1 flex flex-col justify-end">
              <div className="text-5xl lg:text-6xl font-bold tracking-tight text-orange-600 leading-none">48h</div>
              <p className="mt-2 text-sm text-slate-600">SAT reportes<br />listos en 48h.</p>
            </div>
          </MetricCard>

          {/* 7. AUTOMATIZACIÓN IA (wide) */}
          <MetricCard borderClass="border-purple-400/60" className="col-span-2">
            <div className="flex items-start justify-between">
              <h3 className="text-[11px] lg:text-xs font-bold tracking-widest text-slate-800 leading-tight uppercase">
                AUTOMATIZACIÓN IA
              </h3>
            </div>
            <div className="mt-4 flex-1 flex items-end justify-between gap-3">
              <div>
                <div className="text-5xl lg:text-6xl font-bold tracking-tight text-[#0d2650] leading-none">2 min</div>
                <p className="mt-2 text-sm text-slate-600">Mapeo instantáneo.</p>
              </div>
              <BrainIcon className="text-purple-500 shrink-0" />
            </div>
          </MetricCard>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Sistema de cobranza para despachos contables - Tijuana, BC.
          </p>
        </div>
      </aside>

      {/* ═══════════ RIGHT PANEL — Login ═══════════ */}
      <section className="flex-1 relative flex flex-col items-center justify-center p-6 lg:p-10 overflow-hidden">
        {/* Starfield background */}
        <StarfieldBg />

        {/* Top label */}
        <div className="absolute top-6 right-8 text-[11px] tracking-wider text-white/50 uppercase z-10">
          Acceso restringido
        </div>

        {/* Login glass card */}
        <div className="relative z-10 w-full max-w-md">
          <div
            className="rounded-[28px] p-8 lg:p-10 border border-white/10 backdrop-blur-xl"
            style={{
              background: 'linear-gradient(160deg, rgba(40,35,80,0.55) 0%, rgba(22,20,50,0.55) 100%)',
              boxShadow:
                '0 30px 80px -20px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <ShieldLogo />
              <span
                className="text-3xl font-semibold tracking-wider text-white/95"
                style={{ fontFamily: "'Outfit', serif", letterSpacing: '0.15em' }}
              >
                COLLECTA
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* <div>
                <label
                  htmlFor="login-email"
                  className="block text-[11px] font-semibold tracking-widest text-white/70 uppercase mb-2"
                >
                  Usuario
                </label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@despacho.mx"
                    autoComplete="username"
                    disabled={isLoading}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/5 border border-purple-400/50 text-white text-sm placeholder:text-white/35 outline-none transition focus:border-purple-300 focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.15)] disabled:opacity-50"
                  />
                  <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[11px] font-semibold tracking-widest text-white/70 uppercase mb-2"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/5 border border-purple-400/50 text-white text-sm placeholder:text-white/35 outline-none transition focus:border-purple-300 focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.15)] disabled:opacity-50"
                  />
                  <LockIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                </div>
              </div> */}

              {/* Headline */}
              <div className="pt-4">
                <h1
                  className="text-[30px] lg:text-[34px] leading-[1.05] font-extrabold tracking-tight text-white"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  DESBLOQUEA EL<br />
                  POTENCIAL DE<br />
                  TU DESPACHO<br />
                  CON <span className="text-purple-400">COLLECTA</span>
                </h1>
                <p className="mt-4 text-sm text-white/60 leading-relaxed">
                  Inicia sesión para gestionar<br />
                  inteligentemente y escalar tus resultados.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white text-sm font-semibold tracking-wide transition shadow-lg shadow-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-white/50">
            ¿Problemas para acceder?{' '}
            <a href="mailto:admin@collecta.mx" className="text-purple-300 hover:text-purple-200 underline underline-offset-2">
              Contacta al administrador
            </a>
          </p>
        </div>

        {/* Bottom right sparkle */}
        <DiamondSparkle className="absolute bottom-6 right-6 text-purple-400/80 z-10" />
      </section>
    </div>
  );
}

/* ─────────────────────── Sub-components ─────────────────────── */

function MetricCard({
  children,
  borderClass = 'border-slate-200',
  className = '',
}: {
  children: React.ReactNode;
  borderClass?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white border ${borderClass} p-5 flex flex-col shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function StarfieldBg() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 70% 30%, #1a1640 0%, #0a0820 55%, #05040f 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.7) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 45% 80%, rgba(255,255,255,0.7) 50%, transparent 50%),' +
            'radial-gradient(1.5px 1.5px at 15% 70%, rgba(200,180,255,0.9) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 65% 55%, rgba(255,255,255,0.55) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 90% 85%, rgba(255,255,255,0.7) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 35% 15%, rgba(255,255,255,0.6) 50%, transparent 50%),' +
            'radial-gradient(1.5px 1.5px at 70% 75%, rgba(200,180,255,0.8) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 10% 45%, rgba(255,255,255,0.5) 50%, transparent 50%),' +
            'radial-gradient(1px 1px at 55% 40%, rgba(255,255,255,0.6) 50%, transparent 50%)',
          backgroundSize: '400px 400px',
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}

function ShieldLogo() {
  return (
    <svg width="46" height="52" viewBox="0 0 46 52" fill="none" aria-hidden>
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="shieldGradInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      {/* Crown */}
      <path d="M15 8 L19 4 L23 7 L27 4 L31 8 L30 11 H16 Z" fill="url(#shieldGrad)" stroke="#475569" strokeWidth="0.6" />
      {/* Shield body */}
      <path
        d="M23 11 L36 13 V28 C36 38 30 44 23 48 C16 44 10 38 10 28 V13 Z"
        fill="url(#shieldGrad)"
        stroke="#334155"
        strokeWidth="0.7"
      />
      <path
        d="M23 14 L33 16 V28 C33 36 28 41 23 44 C18 41 13 36 13 28 V16 Z"
        fill="url(#shieldGradInner)"
        opacity="0.25"
      />
      {/* Dollar */}
      <text
        x="23"
        y="33"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fill="#1e1b4b"
        fontFamily="Outfit, sans-serif"
      >
        $
      </text>
    </svg>
  );
}



function DiamondSparkle({ className = '' }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SafeIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="16" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 13v-1M20 20v-1M23 16h1M16 16h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <text x="10" y="19" fontSize="8" fontWeight="700" fill="currentColor">$</text>
    </svg>
  );
}

function TrendDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d="M4 10 L14 18 L20 14 L28 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 16v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="26" cy="8" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function ClockGearIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 9v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M24 20v1M24 27v1M20 24h1M27 24h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ChatRocketIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d="M4 8c0-2 1-3 3-3h10c2 0 3 1 3 3v7c0 2-1 3-3 3h-6l-5 4v-4c-1 0-2-1-2-3V8Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 16l7-8c1-1 3 0 2 2l-3 6c-.5 1-1.5 1-2 1l-4-1Z" fill="currentColor" opacity="0.8" />
      <path d="M22 18l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ScrollIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="7" y="5" width="16" height="22" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11h8M11 15h8M11 19h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M22 24l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BrainIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="60" height="50" viewBox="0 0 64 54" fill="none" className={className} aria-hidden>
      <path
        d="M24 8c-6 0-10 4-10 9 0 2 1 4 2 5-2 2-3 4-3 7 0 5 4 9 10 9h16c6 0 10-4 10-9 0-3-1-5-3-7 1-1 2-3 2-5 0-5-4-9-10-9-2 0-4 1-6 2-2-1-4-2-6-2Z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M32 14v24M24 18c2 0 3 2 3 4M40 18c-2 0-3 2-3 4M26 28c2 0 3 1 4 3M38 28c-2 0-3 1-4 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="12" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="54" cy="18" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="14" cy="42" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function MiniBarChart() {
  const bars = [32, 52, 38, 72, 58, 90, 48, 66, 42];
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-end justify-between gap-[3px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{
              height: `${h}%`,
              background: `linear-gradient(180deg, #60a5fa 0%, #3b82f6 50%, #1e3a8a 100%)`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-white/50 mt-1 px-0.5">
        <span>Ene</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Abr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Ago</span>
        <span>Sep</span>
      </div>
    </div>
  );
}
