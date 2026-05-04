interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = confidence >= 0.78 ? 'Alta' : confidence >= 0.55 ? 'Media' : 'Baja';
  const color = confidence >= 0.78
    ? 'var(--brand-success)'
    : confidence >= 0.55
      ? 'var(--brand-warn)'
      : 'var(--brand-danger)';

  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, background: `${color}14`, border: `1px solid ${color}33` }}
    >
      {level} {Math.round(confidence * 100)}%
    </span>
  );
}
