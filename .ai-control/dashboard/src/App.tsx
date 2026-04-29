import { useState, useEffect, useCallback } from 'react'
import StatusPanel from './components/StatusPanel'
import TaskQueue from './components/TaskQueue'
import LogViewer from './components/LogViewer'
import NewTaskForm from './components/NewTaskForm'
import CommandBar from './components/CommandBar'
import * as api from './api'
import { Heartbeat, TaskInfo, LogEntry } from './types'

export default function App() {
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null)
  const [statusLive, setStatusLive] = useState<Heartbeat | null>(null)
  const [tasks, setTasks] = useState<TaskInfo[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function loadAll() {
    setLoading(true)
    const [hb, sl, inboxTasks, workingTasks, doneTasks, allLogs] = await Promise.all([
      api.fetchHeartbeat(),
      api.fetchStatusLive(),
      api.fetchTasks('inbox'),
      api.fetchTasks('working'),
      api.fetchTasks('done'),
      api.fetchLogs(),
    ])
    setHeartbeat(hb)
    setStatusLive(sl)
    setTasks([...inboxTasks, ...workingTasks, ...doneTasks])
    setLogs(allLogs)
    setLastUpdate(new Date().toLocaleTimeString('es-MX'))
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const handleRefresh = useCallback(() => { loadAll() }, [])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0c2340' }}>
            Collecta PC1 Dashboard
          </h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            AI Orchestration Control Center
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn" onClick={loadAll}>Refresh All</button>
          <div className="text-muted mono" style={{ fontSize: 11, marginTop: 4 }}>
            {lastUpdate ? `Updated: ${lastUpdate}` : 'Loading...'}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <StatusPanel heartbeat={heartbeat} statusLive={statusLive} loading={loading} />
        <NewTaskForm onSuccess={handleRefresh} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <TaskQueue tasks={tasks} loading={loading} onRefresh={handleRefresh} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <LogViewer logs={logs} loading={loading} onRefresh={handleRefresh} />
      </div>

      <CommandBar />
    </div>
  )
}
