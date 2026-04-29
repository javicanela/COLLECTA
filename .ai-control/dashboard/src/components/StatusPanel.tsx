import { Heartbeat } from '../types'

interface Props {
  heartbeat: Heartbeat | null
  statusLive: Heartbeat | null
  loading: boolean
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  working: { bg: '#dcfce7', text: '#166534', dot: '#3dba4e' },
  idle: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  error: { bg: '#fef2f2', text: '#991b1b', dot: '#e03535' },
  stalled: { bg: '#fff7ed', text: '#9a3412', dot: '#e07820' },
}

export default function StatusPanel({ heartbeat, statusLive, loading }: Props) {
  const hb = heartbeat || statusLive
  if (!hb) {
    return (
      <div className="card">
        <h2 className="card-title">PC2 Status</h2>
        {loading ? (
          <div className="spinner" />
        ) : (
          <p className="text-muted">No heartbeat data available</p>
        )}
      </div>
    )
  }

  const sc = STATUS_COLORS[hb.status] || STATUS_COLORS.idle

  return (
    <div className="card">
      <h2 className="card-title">PC2 Status</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span
          className={hb.status === 'working' ? 'pulse-dot' : ''}
          style={{
            width: 14, height: 14, borderRadius: '50%',
            background: sc.dot, display: 'inline-block'
          }}
        />
        <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: sc.text, textTransform: 'uppercase' }}>
          {hb.status}
        </span>
      </div>

      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Worker</span>
          <span className="mono info-value">{hb.worker}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Task</span>
          <span className="mono info-value">{hb.task || '—'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Updated</span>
          <span className="mono info-value">{hb.updated_at || '—'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Notes</span>
          <span className="info-value">{hb.notes || '—'}</span>
        </div>
        {hb.last_result && (
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <span className="info-label">Last Result</span>
            <span className="mono info-value">{hb.last_result}</span>
          </div>
        )}
      </div>
    </div>
  )
}
