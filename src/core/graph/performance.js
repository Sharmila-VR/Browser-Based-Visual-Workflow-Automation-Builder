export function getVisibleBounds(viewport, containerSize, padding = 200) {
  const { x, y, zoom } = viewport
  const { width, height } = containerSize

  const minX = -x / zoom - padding
  const minY = -y / zoom - padding
  const maxX = (-x + width) / zoom + padding
  const maxY = (-y + height) / zoom + padding

  return { minX, minY, maxX, maxY }
}

export function isNodeVisible(node, bounds, nodeWidth = 240, nodeHeight = 120) {
  const nx = node.position.x
  const ny = node.position.y
  return (
    nx + nodeWidth >= bounds.minX &&
    nx <= bounds.maxX &&
    ny + nodeHeight >= bounds.minY &&
    ny <= bounds.maxY
  )
}

export function isEdgeVisible(edge, nodeMap, bounds) {
  const sourceNode = nodeMap.get(edge.source)
  const targetNode = nodeMap.get(edge.target)
  if (!sourceNode || !targetNode) return false

  const minEdgeX = Math.min(sourceNode.position.x, targetNode.position.x)
  const maxEdgeX = Math.max(sourceNode.position.x, targetNode.position.x) + 240
  const minEdgeY = Math.min(sourceNode.position.y, targetNode.position.y)
  const maxEdgeY = Math.max(sourceNode.position.y, targetNode.position.y) + 120

  return (
    maxEdgeX >= bounds.minX &&
    minEdgeX <= bounds.maxX &&
    maxEdgeY >= bounds.minY &&
    minEdgeY <= bounds.maxY
  )
}

export function generateBenchmarkWorkflow(nodeCount = 1000) {
  const nodes = []
  const connections = []
  const columns = Math.ceil(Math.sqrt(nodeCount * 1.5))
  const spacingX = 300
  const spacingY = 160

  const types = ['transform', 'filter', 'delay', 'log', 'http']

  for (let i = 0; i < nodeCount; i++) {
    const col = Math.floor(i / 15)
    const row = i % 15
    const type = i === 0 ? 'timer' : types[i % types.length]

    nodes.push({
      id: `bench_node_${i}`,
      type,
      label: `${type.toUpperCase()} #${i}`,
      position: {
        x: 100 + col * spacingX,
        y: 100 + row * spacingY
      },
      data: {
        value: i,
        name: `Node ${i}`,
        expression: `{{ $node.bench_node_${Math.max(0, i - 1)}.data.value + 1 }}`
      },
      inputs: i === 0 ? [] : [{ id: 'in', name: 'Input', type: 'any' }],
      outputs: [{ id: 'out', name: 'Output', type: 'any' }]
    })

    if (i > 0) {
      const prevIndex = Math.max(0, i - 1)
      connections.push({
        id: `bench_conn_${i}_1`,
        source: `bench_node_${prevIndex}`,
        sourceHandle: 'out',
        target: `bench_node_${i}`,
        targetHandle: 'in'
      })

      if (i > 2 && i % 2 === 0) {
        const altPrev = Math.max(0, i - 2)
        connections.push({
          id: `bench_conn_${i}_2`,
          source: `bench_node_${altPrev}`,
          sourceHandle: 'out',
          target: `bench_node_${i}`,
          targetHandle: 'in'
        })
      }
    }
  }

  return { nodes, connections }
}
