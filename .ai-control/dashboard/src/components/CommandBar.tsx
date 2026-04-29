import { useState } from 'react'

const COMMANDS = [
  { label: 'status', cmd: 'powershell -ExecutionPolicy Bypass -File .ai-control\\scripts\\status.ps1', desc: 'Check PC2 status' },
  { label: 'queue', cmd: 'powershell -ExecutionPolicy Bypass -File .ai-control\\scripts\\queue.ps1', desc: 'View task queue' },
  { label: 'logs', cmd: 'powershell -ExecutionPolicy Bypass -File .ai-control\\scripts\\logs.ps1', desc: 'View recent logs' },
  { label: 'task', cmd: 'powershell -ExecutionPolicy Bypass -File .ai-control\\scripts\\task.ps1 -Name "mi-tarea" -Objective "Hacer algo"', desc: 'Create task (edit params)' },
  { label: 'git pull', cmd: 'git pull', desc: 'Sync repo' },
  { label: 'git push', cmd: 'git push', desc: 'Push changes' },
]

export default function CommandBar() {
  const [toast, setToast] = useState<string | null>(null)

  function copyCmd(cmd: string) {
    navigator.clipboard.writeText(cmd)
    setToast('Command copied!')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div className="card">
      <h2 className="card-title">Quick Commands</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {COMMANDS.map(c => (
          <div key={c.label} className="cmd-card">
            <div>
              <div className="mono" style={{ fontWeight: 600, fontSize: 14, color: '#0c2340' }}>{c.label}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>{c.desc}</div>
            </div>
            <button className="btn-sm" onClick={() => copyCmd(c.cmd)}>Copy</button>
          </div>
        ))}
      </div>
      {toast && <div className="toast toast-info">{toast}</div>}
    </div>
  )
}
