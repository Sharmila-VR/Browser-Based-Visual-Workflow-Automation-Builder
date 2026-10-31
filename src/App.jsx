import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Toolbar } from './components/Toolbar/Toolbar.jsx'
import { NodePalette } from './components/Sidebar/NodePalette.jsx'
import { Canvas } from './components/Canvas/Canvas.jsx'
import { ConfigPanel } from './components/ConfigPanel/ConfigPanel.jsx'
import { ExecutionDrawer } from './components/ExecutionInspector/ExecutionDrawer.jsx'
import { DiffModal } from './components/DiffModal/DiffModal.jsx'
import { HistoryModal } from './components/HistoryModal/HistoryModal.jsx'
import { AccessibleListView } from './components/ListView/AccessibleListView.jsx'

import { createNode } from './core/nodes/definitions.js'
import { computeLayeredLayout } from './core/graph/layout.js'
import { generateBenchmarkWorkflow } from './core/graph/performance.js'
import { UndoRedoManager } from './core/history/undoRedo.js'
import { ExecutionStatus, WorkflowEngine } from './core/execution/engine.js'
import { WorkflowScheduler } from './core/execution/scheduler.js'
import {
  saveWorkflowToDb,
  loadWorkflowFromDb,
  saveVersionToDb,
  getVersionsFromDb
} from './core/storage/db.js'
import {
  computeWorkflowDiff,
  exportWorkflowAsJson,
  validateImportedWorkflow
} from './core/storage/versioning.js'

const INITIAL_WORKFLOW = {
  id: 'wf_starter_demo',
  name: 'Customer Order Automation Flow',
  nodes: [
    {
      id: 'node_trigger',
      type: 'webhook',
      label: 'Order Webhook Trigger',
      position: { x: 80, y: 180 },
      data: {
        path: '/webhook/orders',
        method: 'POST',
        samplePayload: '{\n  "orderId": 8042,\n  "customer": "Alex Mercer",\n  "amount": 250,\n  "items": ["Laptop Stand", "USB Hub", "Cable Wrap"],\n  "priority": "high"\n}'
      },
      inputs: [],
      outputs: [{ id: 'out', name: 'Trigger Payload', type: 'object' }]
    },
    {
      id: 'node_transform',
      type: 'transform',
      label: 'Format Order Summary',
      position: { x: 400, y: 180 },
      data: {
        assignments: '{\n  "reference": "ORD-{{ $input.orderId }}",\n  "formattedCustomer": "{{ upper($input.customer) }}",\n  "totalAmount": "{{ $input.amount }}",\n  "itemCount": "{{ length($input.items) }}"\n}',
        mode: 'merge'
      },
      inputs: [{ id: 'in', name: 'In', type: 'any' }],
      outputs: [{ id: 'out', name: 'Transformed Data', type: 'object' }]
    },
    {
      id: 'node_branch',
      type: 'branch',
      label: 'Check Priority Flag',
      position: { x: 720, y: 180 },
      data: {
        condition: '{{ $input.priority == "high" || $input.totalAmount > 100 }}'
      },
      inputs: [{ id: 'in', name: 'In', type: 'flow' }],
      outputs: [
        { id: 'true', name: 'True Branch', type: 'flow' },
        { id: 'false', name: 'False Branch', type: 'flow' }
      ]
    },
    {
      id: 'node_code',
      type: 'code',
      label: 'Sandboxed Priority Tagging',
      position: { x: 1040, y: 100 },
      data: {
        code: 'const input = $input || {};\nreturn {\n  orderRef: input.reference,\n  processedAt: Date.now(),\n  vipExpedited: true,\n  summary: "Order " + input.reference + " tagged for same-day priority shipping."\n};',
        timeoutMs: 2000,
        memoryLimitMb: 16
      },
      inputs: [{ id: 'in', name: 'In', type: 'any' }],
      outputs: [
        { id: 'out', name: 'Result', type: 'any' },
        { id: 'error', name: 'Error', type: 'object' }
      ]
    },
    {
      id: 'node_http',
      type: 'http',
      label: 'Dispatch ERP Notification',
      position: { x: 1040, y: 280 },
      data: {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'POST',
        headers: '{\n  "Content-Type": "application/json"\n}',
        body: '{\n  "order": "{{ $input.reference }}",\n  "status": "standard_delivery"\n}',
        timeout: 5000,
        retries: 2
      },
      inputs: [{ id: 'in', name: 'In', type: 'flow' }],
      outputs: [
        { id: 'out', name: 'Response', type: 'object' },
        { id: 'error', name: 'Error', type: 'object' }
      ]
    },
    {
      id: 'node_loop',
      type: 'loop',
      label: 'Iterate Order Items',
      position: { x: 1360, y: 100 },
      data: {
        itemsExpression: '{{ ["Laptop Stand", "USB Hub", "Cable Wrap"] }}',
        batchSize: 1,
        maxIterations: 20
      },
      inputs: [
        { id: 'in', name: 'In', type: 'flow' },
        { id: 'loopBack', name: 'Loop Feedback', type: 'flow' }
      ],
      outputs: [
        { id: 'loopBody', name: 'Loop Iteration', type: 'any' },
        { id: 'done', name: 'Completed', type: 'array' }
      ]
    },
    {
      id: 'node_merge',
      type: 'merge',
      label: 'Merge Branch Results',
      position: { x: 1680, y: 180 },
      data: {
        mode: 'waitAny',
        joinStrategy: 'combineObject'
      },
      inputs: [
        { id: 'in1', name: 'Branch A', type: 'flow' },
        { id: 'in2', name: 'Branch B', type: 'flow' }
      ],
      outputs: [{ id: 'out', name: 'Merged Output', type: 'object' }]
    },
    {
      id: 'node_log',
      type: 'log',
      label: 'Audit Log & Complete',
      position: { x: 1980, y: 180 },
      data: {
        message: 'Order completed: {{ json($input) }}',
        level: 'INFO'
      },
      inputs: [{ id: 'in', name: 'In', type: 'any' }],
      outputs: [{ id: 'out', name: 'Pass Through', type: 'any' }]
    },
    {
      id: 'node_error',
      type: 'error_handler',
      label: 'Global Error Fallback',
      position: { x: 1360, y: 380 },
      data: {
        catchMode: 'fallback',
        fallbackValue: '{\n  "fallback": true,\n  "status": "Order alert routed to customer support team"\n}',
        retryMax: 3
      },
      inputs: [{ id: 'in', name: 'Error In', type: 'object' }],
      outputs: [
        { id: 'recovered', name: 'Recovered Flow', type: 'flow' },
        { id: 'fatal', name: 'Fatal Output', type: 'object' }
      ]
    }
  ],
  connections: [
    { id: 'c1', source: 'node_trigger', sourceHandle: 'out', target: 'node_transform', targetHandle: 'in' },
    { id: 'c2', source: 'node_transform', sourceHandle: 'out', target: 'node_branch', targetHandle: 'in' },
    { id: 'c3', source: 'node_branch', sourceHandle: 'true', target: 'node_code', targetHandle: 'in' },
    { id: 'c4', source: 'node_branch', sourceHandle: 'false', target: 'node_http', targetHandle: 'in' },
    { id: 'c5', source: 'node_code', sourceHandle: 'out', target: 'node_loop', targetHandle: 'in' },
    { id: 'c6', source: 'node_loop', sourceHandle: 'done', target: 'node_merge', targetHandle: 'in1' },
    { id: 'c7', source: 'node_http', sourceHandle: 'out', target: 'node_merge', targetHandle: 'in2' },
    { id: 'c8', source: 'node_http', sourceHandle: 'error', target: 'node_error', targetHandle: 'in' },
    { id: 'c9', source: 'node_merge', sourceHandle: 'out', target: 'node_log', targetHandle: 'in' }
  ]
}

export function App() {
  const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  const [viewport, setViewport] = useState({ x: 40, y: 60, zoom: 0.85 })
  const [isListView, setIsListView] = useState(false)

  const [executionStatus, setExecutionStatus] = useState(ExecutionStatus.IDLE)
  const [executionStatuses, setExecutionStatuses] = useState({})
  const [nodeOutputs, setNodeOutputs] = useState({})
  const [executionLogs, setExecutionLogs] = useState([])
  const [executionResult, setExecutionResult] = useState(null)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [ariaAnnouncement, setAriaAnnouncement] = useState('')

  const [isDiffOpen, setIsDiffOpen] = useState(false)
  const [diffData, setDiffData] = useState(null)
  const [baselineWorkflow, setBaselineWorkflow] = useState(null)

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [versions, setVersions] = useState([])

  const [scheduledActive, setScheduledActive] = useState(false)

  const undoRedoRef = useRef(new UndoRedoManager(INITIAL_WORKFLOW))
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const workerRef = useRef(null)
  const schedulerRef = useRef(null)
  const fileInputRef = useRef(null)

  const updateUndoRedoAvailability = useCallback(() => {
    setCanUndo(undoRedoRef.current.canUndo())
    setCanRedo(undoRedoRef.current.canRedo())
  }, [])

  const commitWorkflowChange = useCallback(
    (newWorkflow, shouldPushHistory = true) => {
      setWorkflow(newWorkflow)
      if (shouldPushHistory) {
        undoRedoRef.current.push(newWorkflow)
        updateUndoRedoAvailability()
      }
      saveWorkflowToDb(newWorkflow).catch((err) => console.error('Autosave error:', err))
    },
    [updateUndoRedoAvailability]
  )

  useEffect(() => {
    getVersionsFromDb(workflow.id).then((list) => {
      setVersions(list)
      if (list.length > 0 && !baselineWorkflow) {
        setBaselineWorkflow(list[0])
      }
    })
  }, [workflow.id, baselineWorkflow])

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('./core/execution/worker.js', import.meta.url),
        { type: 'module' }
      )

      workerRef.current.onmessage = (e) => {
        const { type, nodeId, status, data, error, log, result } = e.data

        if (type === 'STATUS_UPDATE') {
          setExecutionStatuses((prev) => ({ ...prev, [nodeId]: status }))
          if (data !== null && data !== undefined) {
            setNodeOutputs((prev) => ({ ...prev, [nodeId]: data }))
          }
          if (status === ExecutionStatus.FAILED) {
            setAriaAnnouncement(`Node ${nodeId} failed: ${error || 'Unknown error'}`)
          }
        } else if (type === 'LOG') {
          setExecutionLogs((prev) => [...prev, { ...log, timestamp: Date.now() }])
        } else if (type === 'FINISHED') {
          setExecutionStatus(ExecutionStatus.SUCCESS)
          setExecutionResult(result)
          setAriaAnnouncement(`Workflow finished execution successfully in ${Math.round(result.duration)} milliseconds.`)
        } else if (type === 'ERROR') {
          setExecutionStatus(ExecutionStatus.FAILED)
          setAriaAnnouncement(`Workflow failed: ${error}`)
        } else if (type === 'ABORTED') {
          setExecutionStatus(ExecutionStatus.IDLE)
          setAriaAnnouncement('Workflow execution cancelled.')
        }
      }
    } catch {
      workerRef.current = null
    }

    schedulerRef.current = new WorkflowScheduler((id) => {
      handleRunWorkflow()
    })

    return () => {
      if (workerRef.current) workerRef.current.terminate()
      if (schedulerRef.current) schedulerRef.current.destroy()
    }
  }, [])

  const handleRunWorkflow = useCallback(() => {
    setExecutionStatus(ExecutionStatus.RUNNING)
    setExecutionStatuses({})
    setNodeOutputs({})
    setExecutionLogs([])
    setExecutionResult(null)
    setIsConsoleOpen(true)
    setAriaAnnouncement('Workflow execution started.')

    if (workerRef.current) {
      workerRef.current.postMessage({
        command: 'RUN',
        workflow,
        options: { mockHttp: true }
      })
    } else {
      const engine = new WorkflowEngine(workflow, {
        mockHttp: true,
        onStatusUpdate: (nodeId, status, data, error) => {
          setExecutionStatuses((prev) => ({ ...prev, [nodeId]: status }))
          if (data !== null) {
            setNodeOutputs((prev) => ({ ...prev, [nodeId]: data }))
          }
        },
        onLog: (log) => {
          setExecutionLogs((prev) => [...prev, { ...log, timestamp: Date.now() }])
        }
      })

      engine.execute().then((res) => {
        setExecutionStatus(ExecutionStatus.SUCCESS)
        setExecutionResult(res)
        setAriaAnnouncement(`Workflow execution finished in ${Math.round(res.duration)}ms`)
      }).catch((err) => {
        setExecutionStatus(ExecutionStatus.FAILED)
        setAriaAnnouncement(`Execution failed: ${err.message}`)
      })
    }
  }, [workflow])

  const handleAbortWorkflow = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ command: 'ABORT' })
    }
    setExecutionStatus(ExecutionStatus.IDLE)
    setAriaAnnouncement('Workflow execution aborted.')
  }

  const handleUndo = () => {
    const prev = undoRedoRef.current.undo()
    if (prev) {
      setWorkflow(prev)
      updateUndoRedoAvailability()
      setAriaAnnouncement('Undo performed.')
    }
  }

  const handleRedo = () => {
    const next = undoRedoRef.current.redo()
    if (next) {
      setWorkflow(next)
      updateUndoRedoAvailability()
      setAriaAnnouncement('Redo performed.')
    }
  }

  const handleAutoLayout = () => {
    const layouted = computeLayeredLayout(workflow.nodes, workflow.connections)
    const updatedWorkflow = { ...workflow, nodes: layouted }
    commitWorkflowChange(updatedWorkflow)
    setAriaAnnouncement('Workflow auto-layout applied.')
  }

  const handleAddNode = (type) => {
    const centerX = Math.round((-viewport.x + window.innerWidth / 2) / viewport.zoom)
    const centerY = Math.round((-viewport.y + window.innerHeight / 2) / viewport.zoom)
    const newNode = createNode(type, { x: centerX - 125, y: centerY - 60 })

    const updatedWorkflow = {
      ...workflow,
      nodes: [...workflow.nodes, newNode]
    }
    commitWorkflowChange(updatedWorkflow)
    setSelectedNodeId(newNode.id)
    setAriaAnnouncement(`Added new ${type} node.`)
  }

  const handleAddNodeAtPosition = (type, position) => {
    const newNode = createNode(type, position)
    const updatedWorkflow = {
      ...workflow,
      nodes: [...workflow.nodes, newNode]
    }
    commitWorkflowChange(updatedWorkflow)
    setSelectedNodeId(newNode.id)
    setAriaAnnouncement(`Placed new ${type} node.`)
  }

  const handleUpdateNodePositions = (updates, isFinal) => {
    const updatedMap = new Map(updates.map((u) => [u.id, u.position]))
    const newNodes = workflow.nodes.map((n) => {
      if (updatedMap.has(n.id)) {
        return { ...n, position: updatedMap.get(n.id) }
      }
      return n
    })
    const updatedWorkflow = { ...workflow, nodes: newNodes }
    if (isFinal) {
      commitWorkflowChange(updatedWorkflow, true)
    } else {
      setWorkflow(updatedWorkflow)
    }
  }

  const handleAddConnection = (conn) => {
    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newConn = { id, ...conn }
    const updatedWorkflow = {
      ...workflow,
      connections: [...workflow.connections, newConn]
    }
    commitWorkflowChange(updatedWorkflow)
    setAriaAnnouncement(`Connected ${conn.source} to ${conn.target}`)
  }

  const handleDeleteConnection = (connId) => {
    const updatedConns = workflow.connections.filter((c) => c.id !== connId)
    const updatedWorkflow = { ...workflow, connections: updatedConns }
    commitWorkflowChange(updatedWorkflow)
    setSelectedConnectionId(null)
    setAriaAnnouncement('Connection removed.')
  }

  const handleDeleteNode = (nodeId) => {
    const updatedNodes = workflow.nodes.filter((n) => n.id !== nodeId)
    const updatedConns = workflow.connections.filter(
      (c) => c.source !== nodeId && c.target !== nodeId
    )
    const updatedWorkflow = {
      ...workflow,
      nodes: updatedNodes,
      connections: updatedConns
    }
    commitWorkflowChange(updatedWorkflow)
    setSelectedNodeId(null)
    setAriaAnnouncement('Node deleted.')
  }

  const handleUpdateNodeData = (nodeId, data) => {
    const newNodes = workflow.nodes.map((n) => (n.id === nodeId ? { ...n, data } : n))
    commitWorkflowChange({ ...workflow, nodes: newNodes })
  }

  const handleUpdateNodeLabel = (nodeId, label) => {
    const newNodes = workflow.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n))
    commitWorkflowChange({ ...workflow, nodes: newNodes })
  }

  const handleOpenDiff = () => {
    const base = baselineWorkflow || { nodes: [], connections: [] }
    const diff = computeWorkflowDiff(base, workflow)
    setDiffData(diff)
    setIsDiffOpen(true)
  }

  const handleCreateSnapshot = async (desc) => {
    const record = await saveVersionToDb({
      workflowId: workflow.id,
      description: desc,
      nodes: workflow.nodes,
      connections: workflow.connections
    })
    setVersions((prev) => [record, ...prev])
    setBaselineWorkflow(record)
    setAriaAnnouncement(`Saved snapshot: ${desc}`)
  }

  const handleRestoreVersion = (versionRecord) => {
    const restored = {
      ...workflow,
      nodes: versionRecord.nodes || [],
      connections: versionRecord.connections || []
    }
    commitWorkflowChange(restored)
    setIsHistoryOpen(false)
    setAriaAnnouncement(`Restored workflow to snapshot from ${new Date(versionRecord.timestamp).toLocaleTimeString()}`)
  }

  const handleCompareVersion = (versionRecord) => {
    setBaselineWorkflow(versionRecord)
    const diff = computeWorkflowDiff(versionRecord, workflow)
    setDiffData(diff)
    setIsHistoryOpen(false)
    setIsDiffOpen(true)
  }

  const handleExportJson = () => {
    const jsonStr = exportWorkflowAsJson(workflow)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflow.name.toLowerCase().replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setAriaAnnouncement('Workflow JSON exported.')
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      const validation = validateImportedWorkflow(content)
      if (validation.valid) {
        commitWorkflowChange(validation.workflow)
        setAriaAnnouncement('Workflow JSON imported successfully.')
      } else {
        alert(`Failed to import workflow: ${validation.error}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleStressTest = () => {
    const { nodes, connections } = generateBenchmarkWorkflow(1000)
    const benchWorkflow = {
      id: 'wf_stress_1000',
      name: '1000-Node High Performance Stress Test',
      nodes,
      connections
    }
    commitWorkflowChange(benchWorkflow)
    setViewport({ x: 0, y: 0, zoom: 0.25 })
    setAriaAnnouncement('Loaded 1000 nodes stress test.')
  }

  const handleToggleSchedule = () => {
    if (scheduledActive) {
      if (schedulerRef.current) schedulerRef.current.unregisterSchedule(workflow.id)
      setScheduledActive(false)
      setAriaAnnouncement('Cron scheduler paused.')
    } else {
      if (schedulerRef.current) {
        schedulerRef.current.registerSchedule(workflow.id, '*/5 * * * *')
      }
      setScheduledActive(true)
      setAriaAnnouncement('Cron scheduler activated with 5-minute recurrence.')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault()
          handleDeleteNode(selectedNodeId)
        } else if (selectedConnectionId) {
          e.preventDefault()
          handleDeleteConnection(selectedConnectionId)
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNodeId) {
        e.preventDefault()
        const node = workflow.nodes.find((n) => n.id === selectedNodeId)
        if (!node) return
        const step = e.shiftKey ? 20 : 5
        let dx = 0
        let dy = 0
        if (e.key === 'ArrowUp') dy = -step
        if (e.key === 'ArrowDown') dy = step
        if (e.key === 'ArrowLeft') dx = -step
        if (e.key === 'ArrowRight') dx = step

        handleUpdateNodePositions(
          [{ id: node.id, position: { x: node.position.x + dx, y: node.position.y + dy } }],
          true
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, selectedConnectionId, workflow])

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="app-container">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <Toolbar
        workflowName={workflow.name}
        executionStatus={executionStatus}
        onRun={handleRunWorkflow}
        onAbort={handleAbortWorkflow}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAutoLayout={handleAutoLayout}
        zoom={viewport.zoom}
        onZoomIn={() => setViewport((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }))}
        onZoomOut={() => setViewport((prev) => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.15) }))}
        onZoomReset={() => setViewport((prev) => ({ ...prev, zoom: 1 }))}
        isListView={isListView}
        onToggleView={() => setIsListView((prev) => !prev)}
        onOpenDiff={handleOpenDiff}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onExport={handleExportJson}
        onImportClick={() => fileInputRef.current?.click()}
        onStressTest={handleStressTest}
        scheduledActive={scheduledActive}
        onToggleSchedule={handleToggleSchedule}
      />

      <div className="main-viewport">
        <NodePalette onAddNode={handleAddNode} />

        {isListView ? (
          <AccessibleListView
            nodes={workflow.nodes}
            connections={workflow.connections}
            executionStatuses={executionStatuses}
            nodeOutputs={nodeOutputs}
            onSelectNode={setSelectedNodeId}
            onDeleteNode={handleDeleteNode}
            selectedNodeId={selectedNodeId}
          />
        ) : (
          <Canvas
            nodes={workflow.nodes}
            connections={workflow.connections}
            selectedNodeId={selectedNodeId}
            selectedConnectionId={selectedConnectionId}
            executionStatuses={executionStatuses}
            nodeOutputs={nodeOutputs}
            onSelectNode={setSelectedNodeId}
            onSelectConnection={setSelectedConnectionId}
            onUpdateNodePositions={handleUpdateNodePositions}
            onAddConnection={handleAddConnection}
            onDeleteConnection={handleDeleteConnection}
            onAddNodeAtPosition={handleAddNodeAtPosition}
            viewport={viewport}
            setViewport={setViewport}
            diffData={diffData}
          />
        )}

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            allNodes={workflow.nodes}
            nodeOutputs={nodeOutputs}
            onUpdateData={handleUpdateNodeData}
            onUpdateLabel={handleUpdateNodeLabel}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      <ExecutionDrawer
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen((prev) => !prev)}
        logs={executionLogs}
        statuses={executionStatuses}
        nodeOutputs={nodeOutputs}
        selectedNodeId={selectedNodeId}
        executionResult={executionResult}
      />

      <DiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        diffData={diffData}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        versions={versions}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreVersion={handleRestoreVersion}
        onCompareVersion={handleCompareVersion}
      />
    </div>
  )
}
