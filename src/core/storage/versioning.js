export function computeWorkflowDiff(oldWorkflow, newWorkflow) {
  const oldNodes = oldWorkflow?.nodes || []
  const newNodes = newWorkflow?.nodes || []
  const oldConns = oldWorkflow?.connections || []
  const newConns = newWorkflow?.connections || []

  const oldNodeMap = new Map(oldNodes.map((n) => [n.id, n]))
  const newNodeMap = new Map(newNodes.map((n) => [n.id, n]))

  const addedNodes = []
  const removedNodes = []
  const modifiedNodes = []

  for (const node of newNodes) {
    if (!oldNodeMap.has(node.id)) {
      addedNodes.push(node)
    } else {
      const oldNode = oldNodeMap.get(node.id)
      const dataChanged = JSON.stringify(oldNode.data) !== JSON.stringify(node.data)
      const posChanged =
        oldNode.position.x !== node.position.x || oldNode.position.y !== node.position.y
      const labelChanged = oldNode.label !== node.label

      if (dataChanged || posChanged || labelChanged) {
        modifiedNodes.push({
          current: node,
          previous: oldNode,
          dataChanged,
          posChanged,
          labelChanged
        })
      }
    }
  }

  for (const node of oldNodes) {
    if (!newNodeMap.has(node.id)) {
      removedNodes.push(node)
    }
  }

  const connKey = (c) => `${c.source}:${c.sourceHandle}->${c.target}:${c.targetHandle}`
  const oldConnMap = new Map(oldConns.map((c) => [connKey(c), c]))
  const newConnMap = new Map(newConns.map((c) => [connKey(c), c]))

  const addedConnections = []
  const removedConnections = []

  for (const [key, conn] of newConnMap.entries()) {
    if (!oldConnMap.has(key)) {
      addedConnections.push(conn)
    }
  }

  for (const [key, conn] of oldConnMap.entries()) {
    if (!newConnMap.has(key)) {
      removedConnections.push(conn)
    }
  }

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedConnections,
    removedConnections,
    hasChanges:
      addedNodes.length > 0 ||
      removedNodes.length > 0 ||
      modifiedNodes.length > 0 ||
      addedConnections.length > 0 ||
      removedConnections.length > 0
  }
}

export function exportWorkflowAsJson(workflow) {
  const clean = {
    id: workflow.id,
    name: workflow.name || 'Untitled Workflow',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    nodes: workflow.nodes || [],
    connections: workflow.connections || []
  }
  return JSON.stringify(clean, null, 2)
}

export function validateImportedWorkflow(jsonString) {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Workflow file must be a JSON object' }
    }
    if (!Array.isArray(parsed.nodes)) {
      return { valid: false, error: 'Workflow must contain a nodes array' }
    }
    if (!Array.isArray(parsed.connections)) {
      return { valid: false, error: 'Workflow must contain a connections array' }
    }

    for (const node of parsed.nodes) {
      if (!node.id || !node.type || !node.position) {
        return { valid: false, error: `Invalid node structure in imported file: ${node.id || 'unknown'}` }
      }
    }

    return { valid: true, workflow: parsed }
  } catch (err) {
    return { valid: false, error: `JSON Parse error: ${err.message}` }
  }
}
