import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginModal() {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    const success = await login(email.trim(), password);
    if (!success) {
      setError('Credenciales inválidas. Intenta de nuevo.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bt-navy/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-bt-navy px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bt-green/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-bt-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Iniciar Sesión</h2>
              <p className="text-xs text-slate-400">Acceso al sistema de cobranza</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
              Usuario
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="login-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-bt-green/30 focus:border-bt-green outline-none transition-all text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-bt-green/30 focus:border-bt-green outline-none transition-all text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-bt-green hover:bg-bt-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
          >
            {isLoading ? 'Verificando...' : 'Entrar'}
          </button>

          <p className="text-xs text-center text-slate-400">
            Usa las credenciales configuradas en <code className="bg-slate-100 px-1 rounded">.env</code>
          </p>
        </form>
      </div>
    </div>
  );
}
