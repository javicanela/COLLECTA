const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())

const ROOT = path.resolve(__dirname, '..', '..', '..')
const AI_STATUS = path.join(ROOT, '.ai-status', 'pc2')
const AI_TASKS = path.join(ROOT, '.ai-tasks')
const AI_LOGS = path.join(ROOT, '.ai-logs', 'pc2')

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function listDir(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f !== '.gitkeep')
  } catch {
    return []
  }
}

function getFileInfo(dir, name) {
  const fp = path.join(dir, name)
  try {
    const stat = fs.statSync(fp)
    return { name, modified: stat.mtime.toLocaleString('es-MX'), size: stat.size }
  } catch {
    return null
  }
}

// Heartbeat
app.get('/api/heartbeat', (req, res) => {
  const data = readJSON(path.join(AI_STATUS, 'heartbeat.json'))
  res.json(data || {})
})

// Status live
app.get('/api/status-live', (req, res) => {
  const data = readJSON(path.join(AI_STATUS, 'status-live.json'))
  res.json(data || {})
})

// List tasks by status
app.get('/api/tasks/:status', (req, res) => {
  const { status } = req.params
  const dir = path.join(AI_TASKS, status)
  const files = listDir(dir)
  const tasks = files
    .map(f => {
      const info = getFileInfo(dir, f)
      if (!info) return null
      const content = readText(path.join(dir, f)) || ''
      const firstLines = content.split('\n').slice(0, 2).join(' ').trim().substring(0, 120)
      return {
        id: f.replace('.md', ''),
        name: f.replace('.md', ''),
        status,
        modified: info.modified,
        preview: firstLines || '(empty)'
      }
    })
    .filter(Boolean)
  res.json(tasks)
})

// Read specific task file
app.get('/api/tasks/:status/:name', (req, res) => {
  const { status, name } = req.params
  const fp = path.join(AI_TASKS, status, name.endsWith('.md') ? name : `${name}.md`)
  const content = readText(fp)
  if (content === null) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.type('text/plain').send(content)
})

// Create new task
app.post('/api/tasks', (req, res) => {
  const { name, objective, rules } = req.body
  if (!name || !objective) {
    return res.status(400).json({ ok: false, error: 'Name and objective required' })
  }
  const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 19)
  const filename = `${cleanName}.md`
  const content = `Objetivo:\n${objective}\n\nReglas:\n${rules || '- No borres archivos.\n- No modifiques .env ni secretos.\n- Usa comandos compatibles con PowerShell.'}\n\nCriterio de \u00e9xito:\n- La tarea debe completarse sin romper el proyecto.\n- Debe existir el reporte .ai-logs/pc2/${cleanName}-result.md\n`
  const fp = path.join(AI_TASKS, 'inbox', filename)
  try {
    fs.writeFileSync(fp, content, 'utf8')
    console.log(`[TASK CREATED] ${fp}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// List logs
app.get('/api/logs', (req, res) => {
  const files = listDir(AI_LOGS)
  const logs = files
    .map(f => getFileInfo(AI_LOGS, f))
    .filter(Boolean)
    .sort((a, b) => {
      return new Date(b.modified).getTime() - new Date(a.modified).getTime()
    })
  res.json(logs)
})

// Read specific log
app.get('/api/logs/:name', (req, res) => {
  const { name } = req.params
  const fp = path.join(AI_LOGS, name)
  const content = readText(fp)
  if (content === null) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.type('text/plain').send(content)
})

// Git pull refresh
app.post('/api/refresh', (req, res) => {
  const { execSync } = require('child_process')
  try {
    execSync('git pull', { cwd: ROOT, encoding: 'utf8', timeout: 30000 })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

const PORT = 3002
app.listen(PORT, () => {
  console.log(`PC1 Dashboard API running on http://localhost:${PORT}`)
  console.log(`Root: ${ROOT}`)
})
