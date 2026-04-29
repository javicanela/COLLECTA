export interface Heartbeat {
  updated_at: string
  last_result: string
  notes: string
  worker: string
  status: string
  task: string
}

export interface TaskInfo {
  id: string
  name: string
  status: 'inbox' | 'working' | 'done'
  modified: string
  preview: string
}

export interface LogEntry {
  name: string
  modified: string
  size: number
}

export interface NewTaskPayload {
  name: string
  objective: string
  rules?: string
}
