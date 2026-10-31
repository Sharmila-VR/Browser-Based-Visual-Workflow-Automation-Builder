import { isTypeCompatible, PortTypes } from './types.js'

export function hasCycle(nodes, connections, proposedConnection = null) {
  const allConnections = proposedConnection
    ? [...connections, proposedConnection]
    : connections

  const flowConnections = allConnections.filter((c) => {
    return c.sourceHandle !== 'loopBody' && c.targetHandle !== 'loopBack'
  })

  const adj = new Map()
  for (const node of nodes) {
    adj.set(node.id, [])
  }

  for (const conn of flowConnections) {
    if (adj.has(conn.source)) {
      adj.get(conn.source).push(conn.target)
    }
  }

  const visited = new Set()
  const recStack = new Set()

  function dfs(nodeId) {
    visited.add(nodeId)
    recStack.add(nodeId)

    const neighbors = adj.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      } else if (recStack.has(neighbor)) {
        return true
      }
    }

    recStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }

  return false
}

export function validateConnection(proposed, existingConnections, nodes) {
  if (!proposed.source || !proposed.target) {
    return { valid: false, reason: 'Source and target must be defined' }
  }

  if (proposed.source === proposed.target) {
    return { valid: false, reason: 'Cannot connect a node to itself' }
  }

  const duplicate = existingConnections.some(
    (c) =>
      c.source === proposed.source &&
      c.target === proposed.target &&
      c.sourceHandle === proposed.sourceHandle &&
      c.targetHandle === proposed.targetHandle
  )
  if (duplicate) {
    return { valid: false, reason: 'Connection already exists' }
  }

  const sourceNode = nodes.find((n) => n.id === proposed.source)
  const targetNode = nodes.find((n) => n.id === proposed.target)

  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Node not found' }
  }

  const sourcePort = (sourceNode.outputs || []).find((p) => p.id === proposed.sourceHandle)
  const targetPort = (targetNode.inputs || []).find((p) => p.id === proposed.targetHandle)

  const sourceType = sourcePort?.type || PortTypes.FLOW
  const targetType = targetPort?.type || PortTypes.FLOW

  if (!isTypeCompatible(sourceType, targetType)) {
    return {
      valid: false,
      reason: `Incompatible port types: '${sourceType}' cannot connect to '${targetType}'`
    }
  }

  const isLoopReturn = proposed.targetHandle === 'loopBack' || proposed.sourceHandle === 'loopBody'
  if (!isLoopReturn && hasCycle(nodes, existingConnections, proposed)) {
    return { valid: false, reason: 'Connection creates a cycle in the main flow' }
  }

  return { valid: true }
}
