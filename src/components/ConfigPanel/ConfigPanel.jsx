import React, { useState, useMemo } from 'react'
import { NodeDefinitions } from '../../core/nodes/definitions.js'
import { resolveTemplate } from '../../core/expression/index.js'

export function ConfigPanel({
  node,
  allNodes,
  nodeOutputs,
  onUpdateData,
  onUpdateLabel,
  onDeleteNode,
  onClose
}) {
  const [testExpr, setTestExpr] = useState('')

  const def = node ? NodeDefinitions[node.type] : null

  const evaluationContext = useMemo(() => {
    const nodeDataObj = {}
    for (const [id, out] of Object.entries(nodeOutputs || {})) {
      nodeDataObj[id] = { data: out }
    }
    return {
      $node: nodeDataObj,
      $input: { id: 101, name: 'Sample Payload', active: true, count: 5, items: ['A', 'B', 'C'] },
      $json: { id: 101, name: 'Sample Payload', active: true, count: 5, items: ['A', 'B', 'C'] },
      $env: { API_KEY: 'test_token_123', ENVIRONMENT: 'production' }
    }
  }, [nodeOutputs])

  const testResult = useMemo(() => {
    if (!testExpr.trim()) return null
    try {
      const res = resolveTemplate(testExpr, evaluationContext)
      return typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res)
    } catch (err) {
      return `Error: ${err.message}`
    }
  }, [testExpr, evaluationContext])

  if (!node || !def) {
    return null
  }

  const handleFieldChange = (key, value) => {
    onUpdateData(node.id, {
      ...node.data,
      [key]: value
    })
  }

  return (
    <aside className="inspector-panel" aria-label="Node configuration panel">
      <div className="inspector-header">
        <div>
          <span style={{ fontSize: '0.7rem', color: def.color, fontWeight: 700, textTransform: 'uppercase' }}>
            {def.category}
          </span>
          <h2 className="inspector-title">{node.label || def.label}</h2>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-danger btn-sm" onClick={() => onDeleteNode(node.id)}>
            Delete
          </button>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="inspector-body">
        <div className="form-group">
          <label className="form-label" htmlFor="node-label-input">Node Name</label>
          <input
            id="node-label-input"
            className="form-control"
            type="text"
            value={node.label || ''}
            onChange={(e) => onUpdateLabel(node.id, e.target.value)}
          />
        </div>

        {(def.schema || []).map((field) => {
          const value = node.data?.[field.key] ?? field.default ?? ''
          const inputId = `field-${node.id}-${field.key}`

          let preview = null
          if (field.expressionSupported && typeof value === 'string' && value.includes('{{')) {
            try {
              const res = resolveTemplate(value, evaluationContext)
              preview = typeof res === 'object' ? JSON.stringify(res) : String(res)
            } catch (err) {
              preview = `Error: ${err.message}`
            }
          }

          return (
            <div key={field.key} className="form-group">
              <label className="form-label" htmlFor={inputId}>
                {field.label}
                {field.required && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  id={inputId}
                  className="form-control"
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'number' ? (
                <input
                  id={inputId}
                  className="form-control"
                  type="number"
                  min={field.min}
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                />
              ) : field.type === 'boolean' ? (
                <input
                  id={inputId}
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                />
              ) : field.type === 'textarea' || field.type === 'json' || field.type === 'code' ? (
                <textarea
                  id={inputId}
                  className="form-control"
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  id={inputId}
                  className={`form-control ${field.expressionSupported ? 'expression-box' : ''}`}
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}

              {preview !== null && (
                <div className="expression-preview-badge">
                  Preview: {preview}
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="expr-test-input">Expression Evaluator</label>
            <input
              id="expr-test-input"
              className="form-control expression-box"
              type="text"
              placeholder="{{ $input.name + ' - ' + upper($env.ENVIRONMENT) }}"
              value={testExpr}
              onChange={(e) => setTestExpr(e.target.value)}
            />
            {testResult !== null && (
              <div className="expression-preview-badge" style={{ whiteSpace: 'pre-wrap', marginTop: '6px' }}>
                {testResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
