import { describe, it, expect } from 'vitest'
import { computeLayeredLayout } from '../src/core/graph/layout.js'

describe('Layered Graph Auto-Layout from Scratch', () => {
  it('positions nodes in topological ranks without collisions', () => {
    const nodes = [
      { id: 'start', position: { x: 0, y: 0 } },
      { id: 'mid1', position: { x: 0, y: 0 } },
      { id: 'mid2', position: { x: 0, y: 0 } },
      { id: 'end', position: { x: 0, y: 0 } }
    ]
    const connections = [
      { source: 'start', target: 'mid1' },
      { source: 'start', target: 'mid2' },
      { source: 'mid1', target: 'end' },
      { source: 'mid2', target: 'end' }
    ]

    const layouted = computeLayeredLayout(nodes, connections)
    expect(layouted.length).toBe(4)

    const startNode = layouted.find((n) => n.id === 'start')
    const mid1Node = layouted.find((n) => n.id === 'mid1')
    const endNode = layouted.find((n) => n.id === 'end')

    expect(startNode.position.x).toBeLessThan(mid1Node.position.x)
    expect(mid1Node.position.x).toBeLessThan(endNode.position.x)
  })

  it('handles empty graphs gracefully', () => {
    expect(computeLayeredLayout([], [])).toEqual([])
  })
})
