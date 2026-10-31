import React from 'react'

export function DiffModal({
  isOpen,
  onClose,
  diffData,
  versionAName = 'Previous Version',
  versionBName = 'Current Workflow'
}) {
  if (!isOpen || !diffData) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="diff-dialog-title">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 id="diff-dialog-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Visual Workflow Diff
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Comparing {versionAName} vs {versionBName}
            </div>
          </div>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          {!diffData.hasChanges ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)' }}>
              No differences detected between selected versions.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {diffData.addedNodes.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="diff-badge added">Added Nodes</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({diffData.addedNodes.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {diffData.addedNodes.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid #10b981',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}
                      >
                        + {n.label || n.type} ({n.id})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diffData.modifiedNodes.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="diff-badge modified">Modified Nodes</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({diffData.modifiedNodes.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {diffData.modifiedNodes.map((m) => (
                      <div
                        key={m.current.id}
                        style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid #f59e0b',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>~ {m.current.label || m.current.type}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {m.dataChanged && 'Configuration data updated • '}
                          {m.posChanged && 'Position shifted • '}
                          {m.labelChanged && 'Label renamed'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diffData.removedNodes.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="diff-badge removed">Removed Nodes</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({diffData.removedNodes.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {diffData.removedNodes.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid #ef4444',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}
                      >
                        - {n.label || n.type} ({n.id})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(diffData.addedConnections.length > 0 || diffData.removedConnections.length > 0) && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
                    Connection Link Changes
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {diffData.addedConnections.map((c, i) => (
                      <div key={i} style={{ color: '#6ee7b7' }}>
                        + Link from {c.source} ({c.sourceHandle}) to {c.target} ({c.targetHandle})
                      </div>
                    ))}
                    {diffData.removedConnections.map((c, i) => (
                      <div key={i} style={{ color: '#fca5a5' }}>
                        - Link from {c.source} ({c.sourceHandle}) to {c.target} ({c.targetHandle})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
