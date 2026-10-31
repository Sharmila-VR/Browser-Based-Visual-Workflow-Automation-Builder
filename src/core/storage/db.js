const DB_NAME = 'WorkflowAutomationDB'
const DB_VERSION = 1
const STORE_WORKFLOWS = 'workflows'
const STORE_VERSIONS = 'versions'

let dbInstance = null

export function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_WORKFLOWS)) {
        db.createObjectStore(STORE_WORKFLOWS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const versionStore = db.createObjectStore(STORE_VERSIONS, { keyPath: 'versionId' })
        versionStore.createIndex('workflowId', 'workflowId', { unique: false })
      }
    }

    request.onsuccess = (e) => {
      dbInstance = e.target.result
      resolve(dbInstance)
    }

    request.onerror = (e) => {
      reject(e.target.error)
    }
  })
}

export async function saveWorkflowToDb(workflow) {
  const db = await openDatabase()
  if (!db) {
    localStorage.setItem(`wf_${workflow.id}`, JSON.stringify(workflow))
    return
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WORKFLOWS, 'readwrite')
    const store = tx.objectStore(STORE_WORKFLOWS)
    const request = store.put({
      ...workflow,
      updatedAt: Date.now()
    })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function loadWorkflowFromDb(id) {
  const db = await openDatabase()
  if (!db) {
    const raw = localStorage.getItem(`wf_${id}`)
    return raw ? JSON.parse(raw) : null
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WORKFLOWS, 'readonly')
    const store = tx.objectStore(STORE_WORKFLOWS)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function saveVersionToDb(versionData) {
  const db = await openDatabase()
  const record = {
    versionId: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    ...versionData
  }

  if (!db) {
    const list = JSON.parse(localStorage.getItem(`wf_versions_${versionData.workflowId}`) || '[]')
    list.unshift(record)
    localStorage.setItem(`wf_versions_${versionData.workflowId}`, JSON.stringify(list.slice(0, 30)))
    return record
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VERSIONS, 'readwrite')
    const store = tx.objectStore(STORE_VERSIONS)
    const req = store.add(record)
    req.onsuccess = () => resolve(record)
    req.onerror = () => reject(req.error)
  })
}

export async function getVersionsFromDb(workflowId) {
  const db = await openDatabase()
  if (!db) {
    return JSON.parse(localStorage.getItem(`wf_versions_${workflowId}`) || '[]')
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VERSIONS, 'readonly')
    const store = tx.objectStore(STORE_VERSIONS)
    const index = store.index('workflowId')
    const req = index.getAll(workflowId)
    req.onsuccess = () => {
      const sorted = (req.result || []).sort((a, b) => b.timestamp - a.timestamp)
      resolve(sorted)
    }
    req.onerror = () => reject(req.error)
  })
}
