import React from 'react'
import { NodeDefinitions } from '../../core/nodes/definitions.js'

export function NodeItem({
  node,
  isSelected,
  status,
  outputData,
  onSelect,
  onStartDrag,
  onStartConnect,
  onPortHover,
  onPortLeave,
  connectingDraft,
  diffState
}) {
  const def = NodeDefinitions[node.type] || {}
  const headerColor = def.color || '#3b82f6'

  let diffClass = ''
  if (diffState === 'added') diffClass = 'diff-added'
  if (diffState === 'removed') diffClass = 'diff-removed'
  if (diffState === 'modified') diffClass = 'diff-modified'

  return (
    <div
      id={`node-${node.id}`}
      className={`node-element ${isSelected ? 'selected' : ''} ${status || ''} ${diffClass}`}
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`
      }}
      onMouseDown={(e) => {
        if (e.target.closest('.port-handle')) return
        onSelect(node.id, e)
        onStartDrag(node.id, e)
      }}
      tabIndex={0}
      role="region"
      aria-label={`${node.label || def.label || node.type} node, status ${status || 'idle'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSelect(node.id, e)
        }
      }}
    >
      <div className="node-header" style={{ borderTop: `3px solid ${headerColor}` }}>
        <div className="node-title-group">
          <span
            className="node-type-indicator"
            style={{ backgroundColor: headerColor }}
          />
          <span className="node-title">{node.label || def.label || node.type}</span>
        </div>
        {status && status !== 'idle' && (
          <span className={`node-status-indicator status-${status}`}>{status}</span>
        )}
      </div>

      <div className="node-body">
        <div className="node-ports">
          <div className="ports-column inputs">
            {(node.inputs || []).map((port) => {
              const isCompatible =
                connectingDraft &&
                connectingDraft.source !== node.id &&
                (port.type === 'any' ||
                  connectingDraft.sourceType === 'any' ||
                  port.type === connectingDraft.sourceType)

              return (
                <div key={port.id} className="port-item">
                  <div
                    className={`port-handle type-${port.type} ${
                      connectingDraft ? (isCompatible ? 'connectable' : 'invalid-target') : ''
                    }`}
                    data-node-id={node.id}
                    data-port-id={port.id}
                    data-port-type={port.type}
                    data-port-kind="input"
                    onMouseEnter={() =>
                      onPortHover &&
                      onPortHover({
                        nodeId: node.id,
                        portId: port.id,
                        type: port.type,
                        kind: 'input'
                      })
                    }
                    onMouseLeave={() => onPortLeave && onPortLeave()}
                    title={`Input: ${port.name} (${port.type})`}
                  />
                  <span className="port-label">{port.name}</span>
                </div>
              )
            })}
          </div>

          <div className="ports-column outputs">
            {(node.outputs || []).map((port) => (
              <div key={port.id} className="port-item">
                <span className="port-label">{port.name}</span>
                <div
                  className={`port-handle type-${port.type}`}
                  data-node-id={node.id}
                  data-port-id={port.id}
                  data-port-type={port.type}
                  data-port-kind="output"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    onStartConnect(node.id, port.id, port.type, e)
                  }}
                  title={`Output: ${port.name} (${port.type}) - Drag to connect`}
                />
              </div>
            ))}
          </div>
        </div>

        {outputData !== undefined && outputData !== null && (
          <div className="node-preview-data" title={JSON.stringify(outputData)}>
            Out: {typeof outputData === 'object' ? JSON.stringify(outputData) : String(outputData)}
          </div>
        )}
      </div>
    </div>
  )
}
