export function computeLayeredLayout(nodes, connections, options = {}) {
  const horizontalSpacing = options.horizontalSpacing || 320
  const verticalSpacing = options.verticalSpacing || 160
  const startX = options.startX || 100
  const startY = options.startY || 120

  if (!nodes || nodes.length === 0) {
    return []
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]))
  const inDegree = new Map(nodes.map((n) => [n.id, 0]))
  const outgoing = new Map(nodes.map((n) => [n.id, []]))
  const incoming = new Map(nodes.map((n) => [n.id, []]))

  const validConnections = connections.filter((c) => {
    return nodeMap.has(c.source) && nodeMap.has(c.target) && c.sourceHandle !== 'loopBody'
  })

  for (const conn of validConnections) {
    inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1)
    outgoing.get(conn.source).push(conn.target)
    incoming.get(conn.target).push(conn.source)
  }

  const ranks = new Map()
  const queue = []

  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      ranks.set(id, 0)
      queue.push(id)
    }
  }

  if (queue.length === 0 && nodes.length > 0) {
    ranks.set(nodes[0].id, 0)
    queue.push(nodes[0].id)
  }

  const visited = new Set(queue)
  while (queue.length > 0) {
    const curr = queue.shift()
    const currRank = ranks.get(curr) || 0

    for (const next of outgoing.get(curr) || []) {
      const existingRank = ranks.get(next) ?? 0
      ranks.set(next, Math.max(existingRank, currRank + 1))
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }

  for (const node of nodes) {
    if (!ranks.has(node.id)) {
      ranks.set(node.id, 0)
    }
  }

  const layers = []
  for (const [id, rank] of ranks.entries()) {
    while (layers.length <= rank) {
      layers.push([])
    }
    layers[rank].push(id)
  }

  for (let r = 1; r < layers.length; r++) {
    const layer = layers[r]
    layer.sort((a, b) => {
      const parentsA = incoming.get(a) || []
      const parentsB = incoming.get(b) || []
      const avgA = parentsA.length > 0
        ? parentsA.reduce((sum, p) => sum + (layers[r - 1].indexOf(p) >= 0 ? layers[r - 1].indexOf(p) : 0), 0) / parentsA.length
        : 0
      const avgB = parentsB.length > 0
        ? parentsB.reduce((sum, p) => sum + (layers[r - 1].indexOf(p) >= 0 ? layers[r - 1].indexOf(p) : 0), 0) / parentsB.length
        : 0
      return avgA - avgB
    })
  }

  const maxLayerSize = Math.max(...layers.map((l) => l.length), 1)
  const totalHeight = maxLayerSize * verticalSpacing

  const layoutedNodes = []

  for (let r = 0; r < layers.length; r++) {
    const layer = layers[r]
    const layerHeight = layer.length * verticalSpacing
    const layerStartY = startY + (totalHeight - layerHeight) / 2

    for (let i = 0; i < layer.length; i++) {
      const id = layer[i]
      const originalNode = nodeMap.get(id)
      layoutedNodes.push({
        ...originalNode,
        position: {
          x: startX + r * horizontalSpacing,
          y: layerStartY + i * verticalSpacing
        }
      })
    }
  }

  return layoutedNodes
}
