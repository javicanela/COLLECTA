import { useState } from 'react'
import * as api from '../api'

interface Props {
  onSuccess: () => void
}

export default function NewTaskForm({ onSuccess }: Props) {
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [rules, setRules] = useState('- No borres archivos.\n- No modifiques .env ni secretos.\n- Usa comandos compatibles con PowerShell.')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !objective.trim()) {
      setToast({ msg: 'Nombre y objetivo son requeridos', type: 'error' })
      return
    }
    setSending(true)
    try {
      const res = await api.createTask({ name: name.trim(), objective: objective.trim(), rules })
      if (res.ok) {
        setToast({ msg: `Task "${name}" created in inbox`, type: 'success' })
        setName('')
        setObjective('')
        onSuccess()
      } else {
        setToast({ msg: 'Error creating task', type: 'error' })
      }
    } catch {
      setToast({ msg: 'Error creating task', type: 'error' })
    }
    setSending(false)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="card">
      <h2 className="card-title">New Task</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Task Name</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. revisar-permisos-db"
          />
        </div>
        <div className="form-group">
          <label>Objective</label>
          <textarea
            className="input"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder="What should PC2 do?"
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>Rules (optional)</label>
          <textarea
            className="input"
            value={rules}
            onChange={e => setRules(e.target.value)}
            rows={3}
          />
        </div>
        <button type="submit" className="btn-green" disabled={sending}>
          {sending ? 'Creating...' : 'Create Task'}
        </button>
      </form>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
