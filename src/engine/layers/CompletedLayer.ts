import { unpackCell } from '../../models/cellId'
import { gridToWorldRect } from '../coord'
import type { LayerContext } from './types'

const TICK_PAD = 'rgba(255, 255, 255, 0.88)'
const TICK_INK = 'rgba(26, 26, 26, 0.78)'

export class CompletedLayer {
  readonly name = 'completed'

  draw(lc: LayerContext): void {
    const { ctx, camera, grid, visible, completed } = lc
    if (completed.size === 0 || grid.colCount <= 0) return

    const screenCell = Math.min(grid.cellWidth, grid.cellHeight) * camera.scale
    if (screenCell < 8) return

    const pad = Math.max(grid.cellWidth, grid.cellHeight)
    const left = visible.x - pad
    const right = visible.x + visible.w + pad
    const top = visible.y - pad
    const bottom = visible.y + visible.h + pad

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const id of completed) {
      const cell = unpackCell(id, grid.colCount)
      if (cell.col < 1 || cell.row < 1 || cell.col > grid.colCount || cell.row > grid.rowCount) continue
      const rect = gridToWorldRect(cell, grid)
      if (rect.x + rect.w < left || rect.x > right || rect.y + rect.h < top || rect.y > bottom) continue
      drawMark(ctx, rect, camera.scale, screenCell)
    }

    ctx.restore()
  }
}

function drawMark(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  scale: number,
  screenCell: number,
): void {
  const size = Math.min(rect.w, rect.h) * (screenCell < 16 ? 0.22 : 0.28)
  const inset = Math.min(rect.w, rect.h) * 0.08
  const x = rect.x + rect.w - inset - size
  const y = rect.y + rect.h - inset - size

  roundRect(ctx, x, y, size, size, size * 0.18)
  ctx.fillStyle = TICK_PAD
  ctx.fill()

  if (screenCell < 16) {
    ctx.fillStyle = TICK_INK
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size * 0.22, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.strokeStyle = TICK_INK
  ctx.lineWidth = Math.max(1.15 / scale, size * 0.12)
  ctx.beginPath()
  ctx.moveTo(x + size * 0.22, y + size * 0.52)
  ctx.lineTo(x + size * 0.42, y + size * 0.72)
  ctx.lineTo(x + size * 0.78, y + size * 0.28)
  ctx.stroke()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
