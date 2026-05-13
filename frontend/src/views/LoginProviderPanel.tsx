import { LogIn } from 'lucide-react';
import type { ExternalAuthProviderStatus } from '../services/externalAuthProvider';

interface LoginProviderPanelProps {
  status: ExternalAuthProviderStatus;
  isLoading: boolean;
  onProviderLogin: () => void;
}

export function LoginProviderPanel({ status, isLoading, onProviderLogin }: LoginProviderPanelProps) {
  const disabled = !status.available || isLoading;

  return (
    <div className="border-t border-white/10 pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/55">
          Identidad externa
        </span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
          {status.available ? 'Disponible' : 'Supabase no configurado'}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onProviderLogin}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogIn size={16} />
        {status.available ? 'Continuar con Supabase' : 'Supabase no configurado'}
      </button>

      <p className="mt-2 text-xs leading-relaxed text-white/45">{status.reason}</p>
    </div>
  );
}
