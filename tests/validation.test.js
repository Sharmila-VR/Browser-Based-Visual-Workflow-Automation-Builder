import { describe, it, expect } from 'vitest'
import { hasCycle, validateConnection } from '../src/core/graph/validation.js'
import { PortTypes } from '../src/core/graph/types.js'

describe('Graph Validation & Cycle Prevention', () => {
  const nodes = [
    {
      id: 'n1',
      inputs: [],
      outputs: [{ id: 'out', type: PortTypes.FLOW }]
    },
    {
      id: 'n2',
      inputs: [{ id: 'in', type: PortTypes.FLOW }],
      outputs: [{ id: 'out', type: PortTypes.FLOW }]
    },
    {
      id: 'n3',
      inputs: [{ id: 'in', type: PortTypes.FLOW }],
      outputs: [{ id: 'out', type: PortTypes.FLOW }]
    },
    {
      id: 'n_typed',
      inputs: [{ id: 'in_num', type: PortTypes.NUMBER }],
      outputs: [{ id: 'out_str', type: PortTypes.STRING }]
    }
  ]

  it('detects and prevents cycles in the main flow', () => {
    const connections = [
      { id: 'c1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' },
      { id: 'c2', source: 'n2', sourceHandle: 'out', target: 'n3', targetHandle: 'in' }
    ]

    expect(hasCycle(nodes, connections)).toBe(false)

    const cycleLink = {
      id: 'c3',
      source: 'n3',
      sourceHandle: 'out',
      target: 'n1',
      targetHandle: 'in'
    }

    expect(hasCycle(nodes, connections, cycleLink)).toBe(true)

    const validationResult = validateConnection(cycleLink, connections, nodes)
    expect(validationResult.valid).toBe(false)
    expect(validationResult.reason).toContain('creates a cycle')
  })

  it('prevents connecting a node to itself', () => {
    const selfConn = {
      source: 'n1',
      sourceHandle: 'out',
      target: 'n1',
      targetHandle: 'in'
    }
    const result = validateConnection(selfConn, [], nodes)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Cannot connect a node to itself')
  })

  it('prevents duplicate connections and validates node presence', () => {
    const existing = [
      { id: 'c1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
    ]
    const dup = { source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
    expect(validateConnection(dup, existing, nodes).valid).toBe(false)

    const missingNode = { source: 'n_unknown', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
    expect(validateConnection(missingNode, [], nodes).valid).toBe(false)

    const incomplete = { source: '', target: 'n2' }
    expect(validateConnection(incomplete, [], nodes).valid).toBe(false)
  })

  it('enforces port type compatibility', () => {
    const invalidTypeConn = {
      source: 'n_typed',
      sourceHandle: 'out_str',
      target: 'n_typed',
      targetHandle: 'in_num'
    }
    const resultSelf = validateConnection(invalidTypeConn, [], nodes)
    expect(resultSelf.valid).toBe(false)

    const invalidLink = {
      source: 'n_typed',
      sourceHandle: 'out_str',
      target: 'n2',
      targetHandle: 'in'
    }
    const result = validateConnection(invalidLink, [], nodes)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Incompatible port types')
  })

  it('allows any type connections and loopback paths', () => {
    const anyNode = {
      id: 'any_node',
      inputs: [{ id: 'in', type: PortTypes.ANY }, { id: 'loopBack', type: PortTypes.FLOW }],
      outputs: [{ id: 'out', type: PortTypes.ANY }]
    }
    const allNodes = [...nodes, anyNode]
    const validConn = {
      source: 'n_typed',
      sourceHandle: 'out_str',
      target: 'any_node',
      targetHandle: 'in'
    }
    const res = validateConnection(validConn, [], allNodes)
    expect(res.valid).toBe(true)

    const loopBackLink = {
      source: 'n3',
      sourceHandle: 'out',
      target: 'any_node',
      targetHandle: 'loopBack'
    }
    expect(validateConnection(loopBackLink, [], allNodes).valid).toBe(true)
  })
})
