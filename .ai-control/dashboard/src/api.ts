import { Heartbeat, TaskInfo, LogEntry, NewTaskPayload } from './types'

const BASE = '/api'

export async function fetchHeartbeat(): Promise<Heartbeat | null> {
  const res = await fetch(`${BASE}/heartbeat`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchStatusLive(): Promise<Heartbeat | null> {
  const res = await fetch(`${BASE}/status-live`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchTasks(status: 'inbox' | 'working' | 'done'): Promise<TaskInfo[]> {
  const res = await fetch(`${BASE}/tasks/${status}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchTaskFile(status: string, name: string): Promise<string> {
  const res = await fetch(`${BASE}/tasks/${status}/${encodeURIComponent(name)}`)
  if (!res.ok) return 'Error reading file'
  return res.text()
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const res = await fetch(`${BASE}/logs`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchLogContent(name: string): Promise<string> {
  const res = await fetch(`${BASE}/logs/${encodeURIComponent(name)}`)
  if (!res.ok) return 'Error reading log'
  return res.text()
}

export async function createTask(payload: NewTaskPayload): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.json()
}

export async function refreshStatus(): Promise<void> {
  await fetch(`${BASE}/refresh`, { method: 'POST' })
}
