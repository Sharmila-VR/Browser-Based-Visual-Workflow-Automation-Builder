import React from 'react'

export function Minimap({ nodes, viewport, containerSize, onPanTo }) {
  if (!nodes || nodes.length === 0 || !containerSize.width) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const n of nodes) {
    if (n.position.x < minX) minX = n.position.x
    if (n.position.y < minY) minY = n.position.y
    if (n.position.x > maxX) maxX = n.position.x
    if (n.position.y > maxY) maxY = n.position.y
  }

  const padding = 200
  minX -= padding
  minY -= padding
  maxX += padding + 250
  maxY += padding + 120

  const graphWidth = Math.max(maxX - minX, 1000)
  const graphHeight = Math.max(maxY - minY, 600)

  const mapWidth = 180
  const mapHeight = 110

  const scaleX = mapWidth / graphWidth
  const scaleY = mapHeight / graphHeight
  const scale = Math.min(scaleX, scaleY)

  const viewWorldX = -viewport.x / viewport.zoom
  const viewWorldY = -viewport.y / viewport.zoom
  const viewWorldW = containerSize.width / viewport.zoom
  const viewWorldH = containerSize.height / viewport.zoom

  const viewMapX = (viewWorldX - minX) * scale
  const viewMapY = (viewWorldY - minY) * scale
  const viewMapW = viewWorldW * scale
  const viewMapH = viewWorldH * scale

  const handleMinimapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const targetWorldX = minX + clickX / scale - viewWorldW / 2
    const targetWorldY = minY + clickY / scale - viewWorldH / 2

    onPanTo(-targetWorldX * viewport.zoom, -targetWorldY * viewport.zoom)
  }

  return (
    <div
      className="minimap"
      onClick={handleMinimapClick}
      role="navigation"
      aria-label="Graph minimap overview"
    >
      {nodes.map((n) => {
        const nx = (n.position.x - minX) * scale
        const ny = (n.position.y - minY) * scale
        const nw = 250 * scale
        const nh = 100 * scale
        return (
          <div
            key={n.id}
            className="minimap-node"
            style={{
              left: `${nx}px`,
              top: `${ny}px`,
              width: `${Math.max(nw, 3)}px`,
              height: `${Math.max(nh, 3)}px`
            }}
          />
        )
      })}

      <div
        className="minimap-viewport"
        style={{
          left: `${Math.max(0, viewMapX)}px`,
          top: `${Math.max(0, viewMapY)}px`,
          width: `${Math.min(mapWidth, viewMapW)}px`,
          height: `${Math.min(mapHeight, viewMapH)}px`
        }}
      />
    </div>
  )
}
