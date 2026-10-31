import React from 'react'
import { NodeDefinitions } from '../../core/nodes/definitions.js'

export function AccessibleListView({
  nodes,
  connections,
  executionStatuses,
  nodeOutputs,
  onSelectNode,
  onDeleteNode,
  selectedNodeId
}) {
  return (
    <main className="list-view-container" role="main" aria-label="Workflow nodes list view">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
          Accessible Workflow Node List
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Linear representation of the workflow graph for assistive technologies and keyboard-first navigation.
        </p>

        {nodes.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
            No nodes in this workflow. Use the Node Library to add nodes.
          </div>
        ) : (
          nodes.map((node, index) => {
            const def = NodeDefinitions[node.type] || {}
            const status = executionStatuses[node.id] || 'idle'
            const output = nodeOutputs[node.id]
            const isSelected = selectedNodeId === node.id

            const incoming = connections.filter((c) => c.target === node.id)
            const outgoing = connections.filter((c) => c.source === node.id)

            return (
              <article
                key={node.id}
                className="list-view-card"
                style={{
                  borderLeft: `4px solid ${def.color || '#3b82f6'}`,
                  borderColor: isSelected ? 'var(--border-focus)' : 'var(--border-subtle)'
                }}
                aria-labelledby={`node-title-${node.id}`}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                      #{index + 1}
                    </span>
                    <h3 id={`node-title-${node.id}`} style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {node.label || def.label || node.type}
                    </h3>
                    <span className={`workflow-status-badge status-${status}`}>{status}</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Type: {def.label || node.type} • Category: {def.category}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '16px' }}>
                    <span>
                      Incoming links: {incoming.length > 0 ? incoming.map((c) => c.source).join(', ') : 'None'}
                    </span>
                    <span>
                      Outgoing links: {outgoing.length > 0 ? outgoing.map((c) => c.target).join(', ') : 'None'}
                    </span>
                  </div>

                  {output !== undefined && output !== null && (
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                      Output: {typeof output === 'object' ? JSON.stringify(output) : String(output)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => onSelectNode(node.id)}
                    aria-label={`Configure node ${node.label || node.id}`}
                  >
                    Configure
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => onDeleteNode(node.id)}
                    aria-label={`Delete node ${node.label || node.id}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </main>
  )
}
