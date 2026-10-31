import { resolveDeep, resolveTemplate, evaluateExpression } from '../expression/index.js'
import { executeSandboxedCode } from './sandbox.js'

export const ExecutionStatus = {
  IDLE: 'idle',
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRYING: 'retrying',
  SKIPPED: 'skipped'
}

export class WorkflowEngine {
  constructor(workflow, options = {}) {
    this.workflow = workflow
    this.options = options
    this.onStatusUpdate = options.onStatusUpdate || (() => {})
    this.onLog = options.onLog || (() => {})
    this.nodeOutputs = new Map()
    this.nodeStatuses = new Map()
    this.abortController = new AbortController()

    this.nodeMap = new Map((workflow.nodes || []).map((n) => [n.id, n]))
    this.outgoingEdges = new Map()
    this.incomingEdges = new Map()

    for (const node of workflow.nodes || []) {
      this.outgoingEdges.set(node.id, [])
      this.incomingEdges.set(node.id, [])
      this.nodeStatuses.set(node.id, ExecutionStatus.PENDING)
    }

    for (const conn of workflow.connections || []) {
      if (this.outgoingEdges.has(conn.source)) {
        this.outgoingEdges.get(conn.source).push(conn)
      }
      if (this.incomingEdges.has(conn.target)) {
        this.incomingEdges.get(conn.target).push(conn)
      }
    }
  }

  abort() {
    this.abortController.abort()
  }

  updateNodeStatus(nodeId, status, data = null, error = null) {
    this.nodeStatuses.set(nodeId, status)
    if (data !== null) {
      this.nodeOutputs.set(nodeId, data)
    }
    this.onStatusUpdate(nodeId, status, data, error)
  }

  getUpstreamData(nodeId) {
    const incoming = this.incomingEdges.get(nodeId) || []
    if (incoming.length === 0) return null
    if (incoming.length === 1) {
      return this.nodeOutputs.get(incoming[0].source) ?? null
    }

    const merged = {}
    for (const edge of incoming) {
      const data = this.nodeOutputs.get(edge.source)
      if (data && typeof data === 'object') {
        Object.assign(merged, data)
      }
    }
    return merged
  }

  buildContext(nodeId, inputData) {
    const nodeDataObj = {}
    for (const [id, out] of this.nodeOutputs.entries()) {
      nodeDataObj[id] = { data: out }
    }

    return {
      $input: inputData,
      $json: inputData,
      $node: nodeDataObj,
      $env: this.options.env || {}
    }
  }

  async execute() {
    const startTime = performance.now()
    const startNodes = []

    for (const node of this.workflow.nodes || []) {
      const incoming = this.incomingEdges.get(node.id) || []
      const isStart =
        incoming.length === 0 ||
        node.type === 'webhook' ||
        node.type === 'timer'

      if (isStart) {
        startNodes.push(node.id)
      }
    }

    if (startNodes.length === 0 && (this.workflow.nodes || []).length > 0) {
      startNodes.push(this.workflow.nodes[0].id)
    }

    const activePromises = new Set()
    const completedNodes = new Set()
    const failedNodes = new Set()

    const runNodeWithDeps = async (nodeId) => {
      if (this.abortController.signal.aborted) return

      const node = this.nodeMap.get(nodeId)
      if (!node) return

      if (node.type === 'merge') {
        const incoming = this.incomingEdges.get(nodeId) || []
        const mode = node.data?.mode || 'waitAll'
        if (mode === 'waitAll') {
          const allReady = incoming.every((e) => completedNodes.has(e.source))
          if (!allReady) return
        }
      }

      this.updateNodeStatus(nodeId, ExecutionStatus.RUNNING)

      try {
        const inputData = this.getUpstreamData(nodeId)
        const output = await this.executeNodeWithRetry(node, inputData)
        this.updateNodeStatus(nodeId, ExecutionStatus.SUCCESS, output)
        completedNodes.add(nodeId)

        const nextEdges = this.determineNextEdges(node, output)
        const nextNodeIds = Array.from(new Set(nextEdges.map((e) => e.target)))

        for (const nextId of nextNodeIds) {
          const p = runNodeWithDeps(nextId)
          activePromises.add(p)
          p.finally(() => activePromises.delete(p))
        }
      } catch (err) {
        this.updateNodeStatus(nodeId, ExecutionStatus.FAILED, null, err.message)
        failedNodes.add(nodeId)

        const errorEdges = (this.outgoingEdges.get(nodeId) || []).filter(
          (e) => e.sourceHandle === 'error'
        )

        const directErrorHandlers = (this.outgoingEdges.get(nodeId) || [])
          .map((e) => this.nodeMap.get(e.target))
          .filter((n) => n && n.type === 'error_handler')

        if (errorEdges.length > 0) {
          for (const edge of errorEdges) {
            this.nodeOutputs.set(nodeId, { error: err.message, failedNodeId: nodeId })
            const p = runNodeWithDeps(edge.target)
            activePromises.add(p)
            p.finally(() => activePromises.delete(p))
          }
        } else if (directErrorHandlers.length > 0) {
          for (const handlerNode of directErrorHandlers) {
            this.nodeOutputs.set(nodeId, { error: err.message, failedNodeId: nodeId })
            const p = runNodeWithDeps(handlerNode.id)
            activePromises.add(p)
            p.finally(() => activePromises.delete(p))
          }
        } else {
          this.onLog({
            level: 'ERROR',
            nodeId,
            message: `Node ${node.label || nodeId} failed: ${err.message}`
          })
        }
      }
    }

    for (const startId of startNodes) {
      const p = runNodeWithDeps(startId)
      activePromises.add(p)
      p.finally(() => activePromises.delete(p))
    }

    while (activePromises.size > 0) {
      await Promise.race(Array.from(activePromises))
    }

    const duration = performance.now() - startTime
    return {
      duration,
      statuses: Object.fromEntries(this.nodeStatuses),
      outputs: Object.fromEntries(this.nodeOutputs)
    }
  }

  determineNextEdges(node, output) {
    const outgoing = this.outgoingEdges.get(node.id) || []

    if (node.type === 'branch') {
      const isTrue = Boolean(output)
      const targetHandle = isTrue ? 'true' : 'false'
      return outgoing.filter((e) => e.sourceHandle === targetHandle)
    }

    if (node.type === 'filter') {
      const hasPassed = output && output.passed !== undefined ? output.passed : Boolean(output)
      const handle = hasPassed ? 'passed' : 'rejected'
      return outgoing.filter((e) => e.sourceHandle === handle)
    }

    if (node.type === 'loop') {
      return outgoing.filter((e) => e.sourceHandle === 'done')
    }

    return outgoing.filter((e) => e.sourceHandle !== 'error')
  }

  async executeNodeWithRetry(node, inputData) {
    const maxRetries = Number(node.data?.retries ?? (node.data?.retryMax ?? 0))
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          this.updateNodeStatus(node.id, ExecutionStatus.RETRYING)
          const backoffMs = Math.min(100 * Math.pow(2, attempt - 1), 1000)
          await new Promise((r) => setTimeout(r, backoffMs))
          this.updateNodeStatus(node.id, ExecutionStatus.RUNNING)
        }

        return await this.executeNodeCore(node, inputData)
      } catch (err) {
        attempt++
        if (attempt > maxRetries) {
          throw err
        }
      }
    }
  }

  async executeNodeCore(node, inputData) {
    const context = this.buildContext(node.id, inputData)
    const data = node.data || {}

    switch (node.type) {
      case 'webhook': {
        let payload = inputData
        if (!payload && data.samplePayload) {
          try {
            payload = JSON.parse(data.samplePayload)
          } catch {
            payload = { raw: data.samplePayload }
          }
        }
        return payload || { event: 'manual_trigger', timestamp: Date.now() }
      }

      case 'timer': {
        return {
          timestamp: Date.now(),
          iso: new Date().toISOString(),
          cron: data.cron || '*/5 * * * *'
        }
      }

      case 'http': {
        const resolvedUrl = resolveTemplate(data.url, context)
        const method = data.method || 'GET'
        const headers = data.headers ? resolveDeep(JSON.parse(data.headers || '{}'), context) : {}
        let body = data.body ? resolveTemplate(data.body, context) : undefined

        if (this.options.mockHttp || !navigator.onLine) {
          await new Promise((r) => setTimeout(r, 80))
          return {
            status: 200,
            statusText: 'OK',
            url: resolvedUrl,
            method,
            data: { message: 'Mock response', url: resolvedUrl, input: inputData }
          }
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), Number(data.timeout) || 5000)

        try {
          const res = await fetch(resolvedUrl, {
            method,
            headers,
            body: ['GET', 'HEAD'].includes(method) ? undefined : body,
            signal: controller.signal
          })
          clearTimeout(timeout)

          let resData
          const contentType = res.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            resData = await res.json()
          } else {
            resData = await res.text()
          }

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }

          return {
            status: res.status,
            statusText: res.statusText,
            data: resData
          }
        } catch (fetchErr) {
          clearTimeout(timeout)
          throw fetchErr
        }
      }

      case 'branch': {
        const expr = data.condition || ''
        const result = resolveTemplate(expr, context)
        return Boolean(result && result !== 'false' && result !== '0')
      }

      case 'loop': {
        let items = []
        if (data.itemsExpression) {
          const resolved = resolveTemplate(data.itemsExpression, context)
          if (Array.isArray(resolved)) {
            items = resolved
          } else if (typeof resolved === 'string') {
            try {
              items = JSON.parse(resolved)
            } catch {
              items = [resolved]
            }
          }
        } else if (Array.isArray(inputData)) {
          items = inputData
        }

        const maxIter = Number(data.maxIterations) || 50
        const limited = items.slice(0, maxIter)
        const processed = []

        for (let i = 0; i < limited.length; i++) {
          const item = limited[i]
          processed.push({ index: i, item, processedAt: Date.now() })
        }

        return {
          total: items.length,
          processedCount: processed.length,
          items: processed
        }
      }

      case 'merge': {
        const mode = data.mode || 'waitAll'
        const strategy = data.joinStrategy || 'combineObject'

        const incoming = this.incomingEdges.get(node.id) || []
        const branchOutputs = incoming.map((e) => this.nodeOutputs.get(e.source))

        if (strategy === 'arrayConcat') {
          return branchOutputs.flat().filter(Boolean)
        }

        if (strategy === 'lastWins') {
          return branchOutputs[branchOutputs.length - 1] || null
        }

        const combined = {}
        for (let i = 0; i < branchOutputs.length; i++) {
          const out = branchOutputs[i]
          if (out && typeof out === 'object') {
            Object.assign(combined, out)
          } else if (out !== undefined) {
            combined[`branch_${i + 1}`] = out
          }
        }
        return combined
      }

      case 'code': {
        const code = data.code || 'return $input;'
        const timeoutMs = Number(data.timeoutMs) || 2000
        return await executeSandboxedCode(code, context, timeoutMs)
      }

      case 'transform': {
        let assignments = {}
        if (typeof data.assignments === 'string') {
          try {
            assignments = JSON.parse(data.assignments)
          } catch {
            assignments = { value: data.assignments }
          }
        } else {
          assignments = data.assignments || {}
        }

        const resolved = resolveDeep(assignments, context)
        if (data.mode === 'replace') {
          return resolved
        }
        return {
          ...(typeof inputData === 'object' && inputData !== null ? inputData : {}),
          ...resolved
        }
      }

      case 'delay': {
        const ms = Number(data.milliseconds) || 500
        await new Promise((r) => setTimeout(r, ms))
        return inputData || { delayedMs: ms }
      }

      case 'filter': {
        const expr = data.condition || ''
        const passed = Boolean(resolveTemplate(expr, context))

        return {
          passed,
          data: inputData
        }
      }

      case 'error_handler': {
        let fallback = {}
        if (data.fallbackValue) {
          try {
            fallback = JSON.parse(data.fallbackValue)
          } catch {
            fallback = { raw: data.fallbackValue }
          }
        }
        return {
          recovered: true,
          handledAt: Date.now(),
          ...fallback
        }
      }

      case 'log': {
        const msg = data.message ? resolveTemplate(data.message, context) : 'Log output'
        this.onLog({
          level: data.level || 'INFO',
          nodeId: node.id,
          message: String(msg),
          data: inputData
        })
        return inputData || { logged: true, message: msg }
      }

      default:
        return inputData || { executed: true, nodeId: node.id }
    }
  }
}
