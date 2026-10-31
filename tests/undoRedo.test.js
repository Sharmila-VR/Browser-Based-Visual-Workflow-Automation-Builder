import { describe, it, expect } from 'vitest'
import { UndoRedoManager } from '../src/core/history/undoRedo.js'

describe('Undo / Redo Stack', () => {
  it('manages state pushes, undos, and redos', () => {
    const manager = new UndoRedoManager({ count: 1 })
    expect(manager.canUndo()).toBe(false)
    expect(manager.canRedo()).toBe(false)
    expect(manager.undo()).toBeNull()
    expect(manager.redo()).toBeNull()

    manager.push({ count: 2 })
    expect(manager.canUndo()).toBe(true)
    expect(manager.getCurrent().count).toBe(2)

    manager.push({ count: 2 })
    expect(manager.past.length).toBe(1)

    const undone = manager.undo()
    expect(undone.count).toBe(1)
    expect(manager.canUndo()).toBe(false)
    expect(manager.canRedo()).toBe(true)

    const redone = manager.redo()
    expect(redone.count).toBe(2)
  })

  it('handles grouped batch actions and clearing', () => {
    const manager = new UndoRedoManager({
      nodes: [{ id: 'n1', x: 0, y: 0 }]
    }, 5)

    manager.startGroup()
    manager.startGroup()
    manager.push({ nodes: [{ id: 'n1', x: 10, y: 0 }] })
    manager.push({ nodes: [{ id: 'n1', x: 20, y: 5 }] })
    manager.endGroup({ nodes: [{ id: 'n1', x: 30, y: 10 }] })

    expect(manager.getCurrent().nodes[0].x).toBe(30)
    expect(manager.past.length).toBe(1)

    const reverted = manager.undo()
    expect(reverted.nodes[0].x).toBe(0)

    manager.clear()
    expect(manager.canUndo()).toBe(false)
    expect(manager.canRedo()).toBe(false)
  })

  it('enforces maxHistory constraint and setInitial', () => {
    const manager = new UndoRedoManager(null, 2)
    manager.setInitial({ val: 0 })
    expect(manager.getCurrent().val).toBe(0)

    manager.push({ val: 1 })
    manager.push({ val: 2 })
    manager.push({ val: 3 })
    expect(manager.past.length).toBe(2)

    manager.endGroup(null)
  })
})
