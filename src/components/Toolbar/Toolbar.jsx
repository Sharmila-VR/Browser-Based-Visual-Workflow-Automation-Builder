import React from 'react'
import { ExecutionStatus } from '../../core/execution/engine.js'

export function Toolbar({
  workflowName,
  executionStatus,
  onRun,
  onAbort,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoLayout,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isListView,
  onToggleView,
  onOpenDiff,
  onOpenHistory,
  onExport,
  onImportClick,
  onStressTest,
  scheduledActive,
  onToggleSchedule
}) {
  const isRunning = executionStatus === ExecutionStatus.RUNNING || executionStatus === ExecutionStatus.RETRYING

  return (
    <header className="app-header" role="banner">
      <div className="brand-section">
        <span className="brand-logo-badge">FLOWFORGE</span>
        <h1 className="brand-title">{workflowName}</h1>
        <span className={`workflow-status-badge status-${executionStatus}`}>
          {executionStatus}
        </span>
      </div>

      <div className="header-actions">
        {isRunning ? (
          <button className="btn-danger btn-sm" onClick={onAbort} aria-label="Abort workflow execution">
            Stop Run
          </button>
        ) : (
          <button className="btn-primary btn-sm" onClick={onRun} aria-label="Execute workflow">
            Run Workflow
          </button>
        )}

        <button
          className={scheduledActive ? 'btn-success btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleSchedule}
          aria-label="Toggle cron scheduler"
        >
          {scheduledActive ? 'Schedule: Active' : 'Schedule: Paused'}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo change (Ctrl+Z)"
        >
          Undo
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo change (Ctrl+Y)"
        >
          Redo
        </button>

        <button className="btn-secondary btn-sm" onClick={onAutoLayout} aria-label="Auto arrange graph layout">
          Auto Layout
        </button>

        <button className="btn-secondary btn-sm" onClick={onZoomOut} aria-label="Zoom out canvas">
          Zoom -
        </button>

        <button className="btn-secondary btn-sm" onClick={onZoomReset} aria-label="Reset zoom to 100 percent">
          {Math.round(zoom * 100)}%
        </button>

        <button className="btn-secondary btn-sm" onClick={onZoomIn} aria-label="Zoom in canvas">
          Zoom +
        </button>

        <button className="btn-secondary btn-sm" onClick={onToggleView} aria-label="Toggle between visual canvas and accessible list view">
          {isListView ? 'Canvas View' : 'List View'}
        </button>

        <button className="btn-secondary btn-sm" onClick={onOpenDiff} aria-label="Open version diff comparison">
          Visual Diff
        </button>

        <button className="btn-secondary btn-sm" onClick={onOpenHistory} aria-label="View version history">
          History
        </button>

        <button className="btn-secondary btn-sm" onClick={onExport} aria-label="Export workflow JSON">
          Export
        </button>

        <button className="btn-secondary btn-sm" onClick={onImportClick} aria-label="Import workflow JSON">
          Import
        </button>

        <button className="btn-secondary btn-sm" onClick={onStressTest} aria-label="Load 1000 nodes stress test">
          Stress Test 1000
        </button>
      </div>
    </header>
  )
}
