import React from 'react'
import { NodeDefinitions } from '../../core/nodes/definitions.js'

const CATEGORIES = ['Triggers', 'Logic', 'Operations', 'Transforms', 'Output']

export function NodePalette({ onAddNode }) {
  const grouped = {}
  for (const cat of CATEGORIES) {
    grouped[cat] = []
  }

  for (const [type, def] of Object.entries(NodeDefinitions)) {
    const cat = def.category || 'Operations'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ type, ...def })
  }

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('application/node-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="sidebar-palette" aria-label="Available node library">
      <div className="palette-header">Node Library</div>
      {CATEGORIES.map((cat) => {
        const items = grouped[cat] || []
        if (items.length === 0) return null
        return (
          <div key={cat}>
            <div className="palette-category">{cat}</div>
            {items.map((item) => (
              <div
                key={item.type}
                className="palette-item"
                draggable
                onDragStart={(e) => handleDragStart(e, item.type)}
                onClick={() => onAddNode(item.type)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onAddNode(item.type)
                  }
                }}
                aria-label={`Add ${item.label} to workflow`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: item.color || '#3b82f6',
                      display: 'inline-block'
                    }}
                  />
                  <span className="palette-item-name">{item.label}</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Add</span>
              </div>
            ))}
          </div>
        )
      })}
    </aside>
  )
}
