import { gridToWorldCenter, gridToWorldRect, worldToCanvas } from '../coord'
import type { Layer, LayerContext } from './types'
import type { GridCell, GridMetrics, ViewportState } from '../../models/types'

const CROSS_FILL = 'rgba(26, 26, 26, 0.045)'
const FOCUS_FILL = 'rgba(26, 26, 26, 0.06)'
const STROKE_OUTER = '#1A1A1A'
const STROKE_INNER = '#FFFFFF'
const LABEL_BG = 'rgba(255, 253, 251, 0.92)'
const LABEL_INK = '#2B2420'

export class HighlightLayer implements Layer {
  readonly name = 'highlight'

  drawFill(lc: LayerContext): void {
    const focus = lc.focus
    if (!focus) return
    const { ctx, grid } = lc
    const cell = gridToWorldRect(focus, grid)

    ctx.fillStyle = CROSS_FILL
    ctx.fillRect(grid.originX, cell.y, Math.max(0, cell.x - grid.originX), cell.h)
    ctx.fillRect(cell.x + cell.w, cell.y, Math.max(0, grid.originX + grid.gridWidth - cell.x - cell.w), cell.h)
    ctx.fillRect(cell.x, grid.originY, cell.w, Math.max(0, cell.y - grid.originY))
    ctx.fillRect(cell.x, cell.y + cell.h, cell.w, Math.max(0, grid.originY + grid.gridHeight - cell.y - cell.h))

    ctx.fillStyle = FOCUS_FILL
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h)
  }

  drawStroke(lc: LayerContext): void {
    const focus = lc.focus
    if (!focus) return
    const { ctx, camera, grid } = lc
    const cell = gridToWorldRect(focus, grid)
    const unit = 1 / camera.scale

    ctx.lineJoin = 'miter'
    ctx.strokeStyle = STROKE_OUTER
    ctx.lineWidth = 2 * unit
    ctx.strokeRect(cell.x - unit, cell.y - unit, cell.w + 2 * unit, cell.h + 2 * unit)

    ctx.strokeStyle = STROKE_INNER
    ctx.lineWidth = 2 * unit
    ctx.strokeRect(cell.x + unit, cell.y + unit, Math.max(0, cell.w - 2 * unit), Math.max(0, cell.h - 2 * unit))
  }

  drawLabels(
    ctx: CanvasRenderingContext2D,
    camera: ViewportState,
    grid: GridMetrics,
    focus: GridCell,
    backingWidth: number,
    backingHeight: number,
  ): void {
    const sx = backingWidth / camera.cssWidth
    const sy = backingHeight / camera.cssHeight
    ctx.setTransform(sx, 0, 0, sy, 0, 0)

    const cell = gridToWorldRect(focus, grid)
    const center = worldToCanvas(gridToWorldCenter(focus, grid), camera)
    const top = worldToCanvas({ worldX: cell.x + cell.w / 2, worldY: cell.y }, camera)
    const left = worldToCanvas({ worldX: cell.x, worldY: cell.y + cell.h / 2 }, camera)

    const colX = clamp(center.canvasX, 28, camera.cssWidth - 28)
    const colY = clamp(top.canvasY - 8, 14, camera.cssHeight - 14)
    const rowX = clamp(left.canvasX - 8, 18, camera.cssWidth - 18)
    const rowY = clamp(center.canvasY, 18, camera.cssHeight - 18)

    drawPill(ctx, colX, colY, String(focus.col))
    drawPill(ctx, rowX, rowY, String(focus.row))
  }

  draw(lc: LayerContext): void {
    this.drawFill(lc)
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
): void {
  ctx.save()
  ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const width = Math.max(22, ctx.measureText(text).width + 12)
  const height = 20
  const left = x - width / 2
  const top = y - height / 2
  roundRect(ctx, left, top, width, height, 4)
  ctx.fillStyle = LABEL_BG
  ctx.fill()
  ctx.strokeStyle = 'rgba(26, 26, 26, 0.18)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = LABEL_INK
  ctx.fillText(text, x, y)
  ctx.restore()
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
