import { useState } from 'react'
import { LogEntry } from '../types'
import * as api from '../api'

interface Props {
  logs: LogEntry[]
  loading: boolean
  onRefresh: () => void
}

export default function LogViewer({ logs, loading, onRefresh }: Props) {
  const [selectedLog, setSelectedLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)

  async function openLog(name: string) {
    setSelectedLog(name)
    setContentLoading(true)
    setLogContent('')
    const content = await api.fetchLogContent(name)
    setLogContent(content)
    setContentLoading(false)
  }

  const displayLogs = logs.filter(l => !l.name.endsWith('.gitkeep')).slice(0, 20)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>Logs</h2>
        <button className="btn-sm" onClick={onRefresh}>Refresh</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : displayLogs.length === 0 ? (
        <p className="text-muted">No logs found</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {displayLogs.map(log => (
            <div
              key={log.name}
              className="task-card"
              onClick={() => openLog(log.name)}
            >
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontWeight: 500, fontSize: 12 }}>{log.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: 11 }}>{(log.size / 1024).toFixed(1)} KB</span>
                <span className="text-muted mono" style={{ fontSize: 11 }}>{log.modified}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="mono" style={{ fontSize: 15 }}>{selectedLog}</h3>
              <button className="btn-sm" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
            {contentLoading ? (
              <div className="spinner" />
            ) : (
              <pre>{logContent}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
