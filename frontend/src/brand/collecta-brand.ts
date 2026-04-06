// Collecta — Brand Identity Constants
// Single source of truth for brand values used in TypeScript contexts
// (PDF templates, imperative styling, etc.)
// NOTE: CSS-in-component styling uses index.css variables via Tailwind classes.

export const BRAND = {
  // Primary brand color — deep indigo, authority/fintech/action
  primary:  '#3B4FE8',
  primaryDim:  'rgba(59,79,232,0.10)',
  primaryGlow: 'rgba(59,79,232,0.28)',

  // Status colors
  success:  '#10B77D',   // PAGADO, AL CORRIENTE
  danger:   '#EF3F3F',   // VENCIDO, errors
  warn:     '#F59E0B',   // HOY VENCE, caution
  info:     '#3B82F6',   // AL CORRIENTE, info
  violet:   '#7C3AED',   // WA actions, secondary CTA
  gold:     '#D97706',   // Montos, financial totals

  // Brand dim tints (10% opacity) for badges/buttons
  dim: {
    primary: 'rgba(59,79,232,0.10)',
    success: 'rgba(16,183,125,0.10)',
    danger:  'rgba(239,63,63,0.10)',
    warn:    'rgba(245,158,11,0.10)',
    info:    'rgba(59,130,246,0.10)',
    violet:  'rgba(124,58,237,0.10)',
    gold:    'rgba(217,119,6,0.10)',
  },

  // Sidebar background (always dark, regardless of page theme)
  sidebar: '#1A1F3C',

  // PDF layouts always use light mode palette
  pdf: {
    bg:            '#F0F2FA',
    surface:       '#FFFFFF',
    surfaceRaised: '#F5F7FF',
    headerBg:      '#1A1F3C',
    text:          '#0F1523',
    textSecondary: '#64748B',
    border:        'rgba(59,79,232,0.18)',
    danger:        '#EF3F3F',
    success:       '#10B77D',
    warn:          '#F59E0B',
    info:          '#3B82F6',
    gold:          '#D97706',
  },
} as const;

// Tagline
export const COLLECTA_TAGLINE = 'Cobranza Inteligente';

// Status → brand color mapping (for imperative use)
export const STATUS_COLORS: Record<string, { color: string; dim: string }> = {
  'VENCIDO':      { color: BRAND.danger,  dim: BRAND.dim.danger },
  'HOY VENCE':    { color: BRAND.warn,    dim: BRAND.dim.warn },
  'POR VENCER':   { color: BRAND.gold,    dim: BRAND.dim.gold },
  'AL CORRIENTE': { color: BRAND.info,    dim: BRAND.dim.info },
  'PENDIENTE':    { color: BRAND.info,    dim: BRAND.dim.info },
  'PAGADO':       { color: BRAND.success, dim: BRAND.dim.success },
  'EXCLUIDO':     { color: '#64748B',     dim: 'rgba(100,116,139,0.10)' },
};
