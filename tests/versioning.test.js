import { describe, it, expect } from 'vitest'
import { computeWorkflowDiff, exportWorkflowAsJson, validateImportedWorkflow } from '../src/core/storage/versioning.js'

describe('Workflow Versioning & Visual Diff Engine', () => {
  it('identifies added, removed, and modified nodes and connections', () => {
    const v1 = {
      id: 'wf1',
      nodes: [
        { id: 'n1', position: { x: 10, y: 10 }, data: { val: 1 }, label: 'Node 1' },
        { id: 'n2', position: { x: 100, y: 100 }, data: { val: 2 }, label: 'Node 2' }
      ],
      connections: [
        { source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
      ]
    }

    const v2 = {
      id: 'wf1',
      nodes: [
        { id: 'n1', position: { x: 20, y: 20 }, data: { val: 99 }, label: 'Node 1 Modified' },
        { id: 'n3', position: { x: 200, y: 200 }, data: { val: 3 }, label: 'Node 3 Added' }
      ],
      connections: [
        { source: 'n1', sourceHandle: 'out', target: 'n3', targetHandle: 'in' }
      ]
    }

    const diff = computeWorkflowDiff(v1, v2)
    expect(diff.hasChanges).toBe(true)
    expect(diff.addedNodes.length).toBe(1)
    expect(diff.addedNodes[0].id).toBe('n3')
    expect(diff.removedNodes.length).toBe(1)
    expect(diff.removedNodes[0].id).toBe('n2')
    expect(diff.modifiedNodes.length).toBe(1)
    expect(diff.modifiedNodes[0].current.id).toBe('n1')
    expect(diff.addedConnections.length).toBe(1)
    expect(diff.removedConnections.length).toBe(1)
  })

  it('exports and validates imported workflow JSON', () => {
    const wf = {
      id: 'wf_demo',
      name: 'Demo Flow',
      nodes: [{ id: 'n1', type: 'log', position: { x: 0, y: 0 } }],
      connections: []
    }

    const exported = exportWorkflowAsJson(wf)
    expect(typeof exported).toBe('string')

    const validation = validateImportedWorkflow(exported)
    expect(validation.valid).toBe(true)
    expect(validation.workflow.id).toBe('wf_demo')

    expect(validateImportedWorkflow('invalid json').valid).toBe(false)
    expect(validateImportedWorkflow('{"nodes": "not an array"}').valid).toBe(false)
  })
})
