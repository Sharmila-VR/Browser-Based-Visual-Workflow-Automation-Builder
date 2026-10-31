import React, { useState } from 'react'

export function ExecutionDrawer({
  isOpen,
  onToggle,
  logs,
  statuses,
  nodeOutputs,
  selectedNodeId,
  executionResult
}) {
  const [activeTab, setActiveTab] = useState('logs')

  if (!isOpen) {
    return (
      <div style={{ position: 'absolute', bottom: 0, right: 24, zIndex: 25 }}>
        <button className="btn-secondary btn-sm" onClick={onToggle}>
          Execution Console ({logs.length})
        </button>
      </div>
    )
  }

  const selectedOutput = selectedNodeId ? nodeOutputs[selectedNodeId] : null
  const selectedStatus = selectedNodeId ? statuses[selectedNodeId] : null

  return (
    <section className="bottom-drawer" aria-label="Execution console drawer">
      <div className="drawer-header">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Execution Console</span>
          {executionResult && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Completed in {Math.round(executionResult.duration)}ms
            </span>
          )}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '16px' }}>
            <button
              className={`btn-sm ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('logs')}
            >
              Logs ({logs.length})
            </button>
            <button
              className={`btn-sm ${activeTab === 'inspect' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('inspect')}
            >
              Node Inspector {selectedNodeId ? `(${selectedNodeId})` : ''}
            </button>
          </div>
        </div>
        <button className="btn-secondary btn-sm" onClick={onToggle}>
          Hide Console
        </button>
      </div>

      <div className="drawer-body">
        {activeTab === 'logs' ? (
          <div className="log-list">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', padding: '16px 0' }}>
                No execution logs recorded yet. Click Run Workflow to execute.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`log-row ${log.level}`}>
                  <span style={{ color: 'var(--text-dim)', minWidth: '70px' }}>
                    {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                  <span style={{ fontWeight: 700, minWidth: '50px' }}>[{log.level}]</span>
                  <span style={{ flex: 1 }}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
            {selectedNodeId ? (
              <div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>Node: {selectedNodeId}</span>
                  <span className={`workflow-status-badge status-${selectedStatus || 'idle'}`}>
                    {selectedStatus || 'idle'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Execution Output Payload:
                </div>
                <pre
                  style={{
                    background: 'var(--bg-card)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {selectedOutput !== undefined
                    ? JSON.stringify(selectedOutput, null, 2)
                    : 'No output data produced yet.'}
                </pre>
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', padding: '16px 0' }}>
                Select a node on the canvas to inspect its output payload.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
