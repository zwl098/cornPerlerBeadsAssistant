import { canvasToGrid, canvasToWorld, gridToWorldCenter, screenToCanvas, screenToGrid, worldToCanvas, worldToGrid } from '../src/engine/coord.ts'
import { zoomAt } from '../src/engine/camera.ts'
import { buildGridMetrics } from '../src/models/grid.ts'
import { almostEqual } from '../src/utils/math.ts'
import type { ViewportState } from '../src/models/types.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const cam: ViewportState = {
  scale: 1.6,
  minScale: 0.2,
  maxScale: 12,
  offsetX: 40,
  offsetY: 18,
  cssWidth: 390,
  cssHeight: 700,
  dpr: 3,
}

const anchor = { canvasX: 180, canvasY: 240 }
const worldBefore = canvasToWorld(anchor, cam)
const zoomed = zoomAt(cam, anchor, 1.25)
const worldAfter = canvasToWorld(anchor, zoomed)
assert(almostEqual(worldBefore.worldX, worldAfter.worldX), 'zoomAt must keep world X under anchor')
assert(almostEqual(worldBefore.worldY, worldAfter.worldY), 'zoomAt must keep world Y under anchor')

const roundTrip = worldToCanvas(worldBefore, cam)
assert(almostEqual(roundTrip.canvasX, anchor.canvasX), 'worldToCanvas round-trip X')
assert(almostEqual(roundTrip.canvasY, anchor.canvasY), 'worldToCanvas round-trip Y')

const rect = { left: 12, top: 48 }
const screen = { screenX: 192, screenY: 288 }
const canvas = screenToCanvas(screen, rect)
assert(almostEqual(canvas.canvasX, 180), 'screenToCanvas X')
assert(almostEqual(canvas.canvasY, 240), 'screenToCanvas Y')

for (const size of [100, 200, 500] as const) {
  const grid = buildGridMetrics(
    {
      rowCount: size,
      colCount: size,
      insetLeft: 0,
      insetTop: 0,
      insetRight: 0,
      insetBottom: 0,
    },
    1000,
    1000,
  )
  assert(almostEqual(grid.cellWidth, 1000 / size), `${size} cellWidth`)
  assert(almostEqual(grid.cellHeight, 1000 / size), `${size} cellHeight`)

  const center = { worldX: grid.cellWidth * 7.5, worldY: grid.cellHeight * 11.5 }
  const cell = worldToGrid(center, grid)
  assert(cell?.col === 8 && cell.row === 12, `${size} worldToGrid 8x12`)

  const screenCell = screenToGrid(screen, cam, rect, grid)
  assert(Boolean(screenCell), `${size} screenToGrid exists`)

  for (let i = 0; i < 200; i += 1) {
    const worldX = (i / 199) * 999.999
    const worldY = ((i * 3) % 200 / 199) * 999.999
    const hit = worldToGrid({ worldX, worldY }, grid)
    assert(hit !== null, `${size} coverage ${i}`)
    assert(hit.col >= 1 && hit.col <= size, `${size} col range`)
    assert(hit.row >= 1 && hit.row <= size, `${size} row range`)
  }
}

process.stdout.write('coord-camera checks passed for 100 / 200 / 500\n')

{
  const grid = buildGridMetrics(
    { rowCount: 50, colCount: 50, insetLeft: 0, insetTop: 0, insetRight: 0, insetBottom: 0 },
    1000,
    1000,
  )
  const target = { row: 8, col: 12 }
  const center = gridToWorldCenter(target, grid)
  const zoomed = zoomAt(cam, { canvasX: 90, canvasY: 140 }, 1.8)
  const canvasHit = worldToCanvas(center, zoomed)
  const viaCanvas = canvasToGrid(canvasHit, zoomed, grid)
  assert(viaCanvas?.row === 8 && viaCanvas.col === 12, 'click after zoom: canvasToGrid')

  const screenHit = {
    screenX: canvasHit.canvasX + rect.left,
    screenY: canvasHit.canvasY + rect.top,
  }
  const viaScreen = screenToGrid(screenHit, zoomed, rect, grid)
  assert(viaScreen?.row === 8 && viaScreen.col === 12, 'click after zoom: screenToGrid')

  const panned = { ...zoomed, offsetX: zoomed.offsetX + 120, offsetY: zoomed.offsetY - 80 }
  const canvasAfterPan = worldToCanvas(center, panned)
  const viaPan = canvasToGrid(canvasAfterPan, panned, grid)
  assert(viaPan?.row === 8 && viaPan.col === 12, 'click after pan: canvasToGrid')
}

process.stdout.write('zoom/pan hit tests passed\n')

