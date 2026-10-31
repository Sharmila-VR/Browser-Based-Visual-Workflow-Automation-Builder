import React, { useState } from 'react'

export function HistoryModal({
  isOpen,
  onClose,
  versions,
  onCreateSnapshot,
  onRestoreVersion,
  onCompareVersion
}) {
  const [snapshotName, setSnapshotName] = useState('')

  if (!isOpen) return null

  const handleCreate = (e) => {
    e.preventDefault()
    if (!snapshotName.trim()) return
    onCreateSnapshot(snapshotName.trim())
    setSnapshotName('')
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="history-dialog-title">
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="history-dialog-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Workflow Version History
          </h2>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Snapshot description (e.g. Added error retry logic)"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
            />
            <button type="submit" className="btn-primary btn-sm">
              Save Snapshot
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {versions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)' }}>
                No version snapshots created yet.
              </div>
            ) : (
              versions.map((ver) => (
                <div
                  key={ver.versionId}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {ver.description || ver.versionId}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(ver.timestamp).toLocaleString()} • {ver.nodes?.length || 0} nodes, {ver.connections?.length || 0} links
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onCompareVersion(ver)}
                    >
                      Compare Diff
                    </button>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => onRestoreVersion(ver)}
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
