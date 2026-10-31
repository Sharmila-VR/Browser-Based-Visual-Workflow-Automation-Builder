import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { NodeItem } from './NodeItem.jsx'
import { Minimap } from './Minimap.jsx'
import { getVisibleBounds, isNodeVisible, isEdgeVisible } from '../../core/graph/performance.js'
import { validateConnection } from '../../core/graph/validation.js'
import { NodeDefinitions } from '../../core/nodes/definitions.js'

export function Canvas({
  nodes,
  connections,
  selectedNodeId,
  selectedConnectionId,
  executionStatuses,
  nodeOutputs,
  onSelectNode,
  onSelectConnection,
  onUpdateNodePositions,
  onAddConnection,
  onDeleteConnection,
  onAddNodeAtPosition,
  viewport,
  setViewport,
  diffData
}) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [dragState, setDragState] = useState(null)
  const [connectingDraft, setConnectingDraft] = useState(null)
  const [hoveredPort, setHoveredPort] = useState(null)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const visibleBounds = useMemo(() => {
    return getVisibleBounds(viewport, containerSize, 300)
  }, [viewport, containerSize])

  const visibleNodes = useMemo(() => {
    if (nodes.length < 50) return nodes
    return nodes.filter((n) => isNodeVisible(n, visibleBounds))
  }, [nodes, visibleBounds])

  const visibleConnections = useMemo(() => {
    if (connections.length < 80) return connections
    return connections.filter((c) => isEdgeVisible(c, nodeMap, visibleBounds))
  }, [connections, nodeMap, visibleBounds])

  const getPortCoordinates = useCallback((nodeId, portId, isOutput) => {
    const node = nodeMap.get(nodeId)
    if (!node) return { x: 0, y: 0 }

    const nodeWidth = 250
    const headerHeight = 36
    const portSpacing = 24

    const portsList = isOutput ? node.outputs || [] : node.inputs || []
    const index = Math.max(0, portsList.findIndex((p) => p.id === portId))
    const portY = node.position.y + headerHeight + 14 + index * portSpacing
    const portX = isOutput ? node.position.x + nodeWidth : node.position.x

    return { x: portX, y: portY }
  }, [nodeMap])

  const handleWheel = (e) => {
    e.preventDefault()
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.15), 3)

    const worldX = (mouseX - viewport.x) / viewport.zoom
    const worldY = (mouseY - viewport.y) / viewport.zoom

    const newX = mouseX - worldX * newZoom
    const newY = mouseY - worldY * newZoom

    setViewport({ x: newX, y: newY, zoom: newZoom })
  }

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-element') || e.target.closest('.minimap') || e.target.closest('.canvas-controls')) {
      return
    }
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true)
      setDragState({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initViewportX: viewport.x,
        initViewportY: viewport.y
      })
      onSelectNode(null)
      onSelectConnection(null)
    }
  }

  const handleMouseMove = (e) => {
    if (!dragState) return

    if (dragState.type === 'pan') {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      setViewport((prev) => ({
        ...prev,
        x: dragState.initViewportX + dx,
        y: dragState.initViewportY + dy
      }))
    } else if (dragState.type === 'node') {
      const dx = (e.clientX - dragState.startX) / viewport.zoom
      const dy = (e.clientY - dragState.startY) / viewport.zoom

      const updated = dragState.initialNodes.map((n) => ({
        id: n.id,
        position: {
          x: Math.round(n.x + dx),
          y: Math.round(n.y + dy)
        }
      }))
      onUpdateNodePositions(updated, false)
    } else if (dragState.type === 'connect') {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const mouseWorldX = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const mouseWorldY = (e.clientY - rect.top - viewport.y) / viewport.zoom

      setConnectingDraft((prev) => (prev ? { ...prev, currentX: mouseWorldX, currentY: mouseWorldY } : null))
    }
  }

  const handleMouseUp = () => {
    if (!dragState) return

    if (dragState.type === 'node') {
      const node = nodeMap.get(dragState.nodeId)
      if (node) {
        onUpdateNodePositions([{ id: node.id, position: node.position }], true)
      }
    } else if (dragState.type === 'connect' && connectingDraft) {
      if (hoveredPort && hoveredPort.kind === 'input') {
        const proposed = {
          source: connectingDraft.source,
          sourceHandle: connectingDraft.sourceHandle,
          target: hoveredPort.nodeId,
          targetHandle: hoveredPort.portId
        }
        const validation = validateConnection(proposed, connections, nodes)
        if (validation.valid) {
          onAddConnection(proposed)
        }
      }
      setConnectingDraft(null)
      setHoveredPort(null)
    }

    setIsPanning(false)
    setDragState(null)
  }

  const handleStartNodeDrag = (nodeId, e) => {
    const node = nodeMap.get(nodeId)
    if (!node) return

    setDragState({
      type: 'node',
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialNodes: [{ id: node.id, x: node.position.x, y: node.position.y }]
    })
  }

  const handleStartConnect = (nodeId, portId, portType, e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseWorldX = (e.clientX - rect.left - viewport.x) / viewport.zoom
    const mouseWorldY = (e.clientY - rect.top - viewport.y) / viewport.zoom

    const coords = getPortCoordinates(nodeId, portId, true)

    setConnectingDraft({
      source: nodeId,
      sourceHandle: portId,
      sourceType: portType,
      startX: coords.x,
      startY: coords.y,
      currentX: mouseWorldX,
      currentY: mouseWorldY
    })

    setDragState({
      type: 'connect',
      startX: e.clientX,
      startY: e.clientY
    })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('application/node-type')
    if (!nodeType || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom
    const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom

    onAddNodeAtPosition(nodeType, { x: Math.round(worldX), y: Math.round(worldY) })
  }

  const renderBezier = (x1, y1, x2, y2) => {
    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40)
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
  }

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${isPanning ? 'panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      tabIndex={0}
      role="region"
      aria-label="Workflow Canvas"
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <svg className="canvas-svg">
          {visibleConnections.map((conn) => {
            const start = getPortCoordinates(conn.source, conn.sourceHandle, true)
            const end = getPortCoordinates(conn.target, conn.targetHandle, false)
            const isSelected = selectedConnectionId === conn.id
            const isSourceActive = executionStatuses[conn.source] === 'running'

            let connClass = ''
            if (diffData?.addedConnections?.some((c) => c.source === conn.source && c.target === conn.target)) {
              connClass = 'diff-added'
            } else if (diffData?.removedConnections?.some((c) => c.source === conn.source && c.target === conn.target)) {
              connClass = 'diff-removed'
            }

            return (
              <path
                key={conn.id || `${conn.source}-${conn.target}`}
                d={renderBezier(start.x, start.y, end.x, end.y)}
                className={`connection-path ${isSelected ? 'selected' : ''} ${isSourceActive ? 'active' : ''} ${connClass}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectConnection(conn.id)
                }}
              />
            )
          })}

          {connectingDraft && (
            <path
              d={renderBezier(
                connectingDraft.startX,
                connectingDraft.startY,
                hoveredPort ? getPortCoordinates(hoveredPort.nodeId, hoveredPort.portId, false).x : connectingDraft.currentX,
                hoveredPort ? getPortCoordinates(hoveredPort.nodeId, hoveredPort.portId, false).y : connectingDraft.currentY
              )}
              className={`draft-connection ${
                hoveredPort &&
                !validateConnection(
                  {
                    source: connectingDraft.source,
                    sourceHandle: connectingDraft.sourceHandle,
                    target: hoveredPort.nodeId,
                    targetHandle: hoveredPort.portId
                  },
                  connections,
                  nodes
                ).valid
                  ? 'invalid'
                  : ''
              }`}
            />
          )}
        </svg>

        {visibleNodes.map((node) => {
          let diffState = null
          if (diffData?.addedNodes?.some((n) => n.id === node.id)) diffState = 'added'
          if (diffData?.removedNodes?.some((n) => n.id === node.id)) diffState = 'removed'
          if (diffData?.modifiedNodes?.some((m) => m.current.id === node.id)) diffState = 'modified'

          return (
            <NodeItem
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              status={executionStatuses[node.id]}
              outputData={nodeOutputs[node.id]}
              onSelect={onSelectNode}
              onStartDrag={handleStartNodeDrag}
              onStartConnect={handleStartConnect}
              onPortHover={setHoveredPort}
              onPortLeave={() => setHoveredPort(null)}
              connectingDraft={connectingDraft}
              diffState={diffState}
            />
          )
        })}
      </div>

      <Minimap
        nodes={nodes}
        viewport={viewport}
        containerSize={containerSize}
        onPanTo={(targetX, targetY) => {
          setViewport((prev) => ({ ...prev, x: targetX, y: targetY }))
        }}
      />
    </div>
  )
}
