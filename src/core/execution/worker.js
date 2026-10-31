import { WorkflowEngine } from './engine.js'

let activeEngine = null

self.onmessage = async (e) => {
  const { command, workflow, options } = e.data

  if (command === 'ABORT') {
    if (activeEngine) {
      activeEngine.abort()
      activeEngine = null
    }
    self.postMessage({ type: 'ABORTED' })
    return
  }

  if (command === 'RUN') {
    try {
      activeEngine = new WorkflowEngine(workflow, {
        ...options,
        onStatusUpdate: (nodeId, status, data, error) => {
          self.postMessage({
            type: 'STATUS_UPDATE',
            nodeId,
            status,
            data,
            error
          })
        },
        onLog: (log) => {
          self.postMessage({
            type: 'LOG',
            log
          })
        }
      })

      const result = await activeEngine.execute()
      activeEngine = null
      self.postMessage({
        type: 'FINISHED',
        result
      })
    } catch (err) {
      activeEngine = null
      self.postMessage({
        type: 'ERROR',
        error: err.message
      })
    }
  }
}
