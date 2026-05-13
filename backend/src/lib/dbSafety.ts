export function evaluateTestDbSafety(url: string, env: NodeJS.ProcessEnv) {
  if (!url) {
    return { safe: false, reason: 'DATABASE_URL vacio' };
  }

  const lower = url.toLowerCase();
  const allowedHosts = ['localhost', '127.0.0.1', 'collecta-test-postgres'];
  const looksProd = /(neon|railway|supabase|heroku|amazonaws|azure|render)/.test(lower);
  const hasAllowedHost = allowedHosts.some(h => lower.includes(`@${h}`) || lower.includes(`@${h}:`));
  const hasTestMarker = lower.includes('test') || (env.NODE_ENV === 'test');

  if (looksProd) {
    return { safe: false, reason: 'DATABASE_URL parece de produccion' };
  }
  if (!hasAllowedHost && !hasTestMarker) {
    return { safe: false, reason: 'DATABASE_URL no apunta a host local ni marca test' };
  }

  return { safe: true, reason: 'DB segura para operaciones destructivas locales' };
}
