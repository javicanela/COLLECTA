import { useState } from 'react'
import { TaskInfo } from '../types'
import * as api from '../api'

interface Props {
  tasks: TaskInfo[]
  loading: boolean
  onRefresh: () => void
}

const TAB_CONFIG = [
  { key: 'inbox' as const, label: 'Inbox', color: '#e07820', count: 0 },
  { key: 'working' as const, label: 'Working', color: '#2e7cf0', count: 0 },
  { key: 'done' as const, label: 'Done', color: '#3dba4e', count: 0 },
]

export default function TaskQueue({ tasks, loading, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'working' | 'done'>('done')
  const [selectedTask, setSelectedTask] = useState<TaskInfo | null>(null)
  const [taskContent, setTaskContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)

  const filtered = tasks.filter(t => t.status === activeTab)
  const tabCounts = {
    inbox: tasks.filter(t => t.status === 'inbox').length,
    working: tasks.filter(t => t.status === 'working').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  async function openTask(task: TaskInfo) {
    setSelectedTask(task)
    setContentLoading(true)
    setTaskContent('')
    const content = await api.fetchTaskFile(task.status, task.name)
    setTaskContent(content)
    setContentLoading(false)
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>Task Queue</h2>
        <button className="btn-sm" onClick={onRefresh}>Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === tab.key ? tab.color : '#e2e8f0',
              color: activeTab === tab.key ? 'white' : '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <p className="text-muted">No tasks in {activeTab}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(task => (
            <div
              key={task.id}
              className="task-card"
              onClick={() => openTask(task)}
            >
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{task.name}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{task.preview}</div>
              </div>
              <span className="text-muted mono" style={{ fontSize: 11 }}>{task.modified}</span>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="mono" style={{ fontSize: 15 }}>{selectedTask.name}</h3>
              <button className="btn-sm" onClick={() => setSelectedTask(null)}>Close</button>
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Status: {selectedTask.status} | Modified: {selectedTask.modified}
            </div>
            {contentLoading ? (
              <div className="spinner" />
            ) : (
              <pre>{taskContent}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
