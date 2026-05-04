import { AlertTriangle, CheckCircle2, GitCompareArrows } from 'lucide-react';
import type { SmartImportAnalysis } from '../domain/types';
import { ConfidenceBadge } from './ConfidenceBadge';

interface ImportSummaryProps {
  analysis: SmartImportAnalysis;
  lowConfidenceCount: number;
}

export function ImportSummary({ analysis, lowConfidenceCount }: ImportSummaryProps) {
  const challengeColor = analysis.challengeResult.status === 'changed'
    ? 'var(--brand-info)'
    : analysis.challengeResult.status === 'downgraded'
      ? 'var(--brand-warn)'
      : 'var(--brand-success)';

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr] gap-3">
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-raised)] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Confianza global</span>
          <ConfidenceBadge confidence={analysis.confidence} />
        </div>
        <p className="text-2xl font-black mt-2" style={{ color: 'var(--c-text)' }}>{analysis.canonicalRows.length}</p>
        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>filas canonicas</p>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-raised)] p-4">
        <div className="flex items-center gap-2">
          {lowConfidenceCount > 0 ? <AlertTriangle size={16} style={{ color: 'var(--brand-warn)' }} /> : <CheckCircle2 size={16} style={{ color: 'var(--brand-success)' }} />}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Revision</span>
        </div>
        <p className="text-2xl font-black mt-2" style={{ color: lowConfidenceCount > 0 ? 'var(--brand-warn)' : 'var(--brand-success)' }}>{lowConfidenceCount}</p>
        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>mapeos de baja confianza</p>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-raised)] p-4">
        <div className="flex items-center gap-2">
          <GitCompareArrows size={16} style={{ color: challengeColor }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Challenge</span>
        </div>
        <p className="text-sm font-bold mt-2" style={{ color: challengeColor }}>{analysis.challengeResult.status}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>
          {analysis.challengeResult.findings.join(', ')}
        </p>
      </div>
    </div>
  );
}
