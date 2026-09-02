import { almostEqual } from '../src/utils/math.ts'
import { buildGridMetrics, gridFromCorners, gridStillFits, scaleGrid, shiftGrid, suggestPixelGrid } from '../src/models/grid.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(suggestPixelGrid(32, 32)?.colCount === 32, 'pixel art 32 col')
assert(suggestPixelGrid(32, 32)?.rowCount === 32, 'pixel art 32 row')
assert(suggestPixelGrid(1080, 1080) === null, 'screenshot must not guess')
assert(suggestPixelGrid(501, 501) === null, 'over max must not guess')

{
  const origin = 18
  const cell = 10
  const n = 32
  const size = origin * 2 + n * cell
  const spec = gridFromCorners(
    { worldX: origin, worldY: origin },
    { worldX: origin + n * cell, worldY: origin + n * cell },
    n,
    n,
    size,
    size,
  )
  assert(Boolean(spec), 'pin spec exists')
  assert(spec!.colCount === 32 && spec!.rowCount === 32, 'pin counts')
  assert(almostEqual(spec!.insetLeft, origin), `insetLeft ${spec!.insetLeft}`)
  assert(almostEqual(spec!.insetTop, origin), `insetTop ${spec!.insetTop}`)
  assert(almostEqual(spec!.insetRight, origin), `insetRight ${spec!.insetRight}`)
  assert(almostEqual(spec!.insetBottom, origin), `insetBottom ${spec!.insetBottom}`)
  const metrics = buildGridMetrics(spec!, size, size)
  assert(almostEqual(metrics.cellWidth, cell), 'cellWidth from pin')
  assert(almostEqual(metrics.cellHeight, cell), 'cellHeight from pin')
  assert(almostEqual(metrics.originX, origin), 'originX from pin')
}

{
  const swapped = gridFromCorners(
    { worldX: 338, worldY: 338 },
    { worldX: 18, worldY: 18 },
    32,
    32,
    356,
    356,
  )
  assert(Boolean(swapped), 'swapped points work')
  assert(almostEqual(swapped!.insetLeft, 18), 'swapped insetLeft')
}

{
  const skewed = gridFromCorners(
    { worldX: 20, worldY: 10 },
    { worldX: 20 + 32 * 10, worldY: 10 + 32 * 12 },
    32,
    32,
    400,
    400,
  )
  assert(Boolean(skewed), 'square board stays square')
  const metrics = buildGridMetrics(skewed!, 400, 400)
  assert(almostEqual(metrics.cellWidth, metrics.cellHeight), 'forced square cell')
}

assert(gridFromCorners({ worldX: 10, worldY: 10 }, { worldX: 11, worldY: 11 }, 32, 32, 400, 400) === null, 'too close')
assert(gridFromCorners({ worldX: 10, worldY: 10 }, { worldX: 200, worldY: 200 }, 1, 32, 400, 400) === null, 'single row rejected')

{
  const base = {
    rowCount: 32,
    colCount: 32,
    insetLeft: 18,
    insetTop: 18,
    insetRight: 18,
    insetBottom: 18,
    calibrated: true,
  }
  const moved = shiftGrid(base, 2, -1)
  assert(almostEqual(moved.insetLeft, 20), 'shift left')
  assert(almostEqual(moved.insetRight, 16), 'shift right inset')
  assert(almostEqual(moved.insetTop, 17), 'shift top')
  const before = buildGridMetrics(base, 356, 356)
  const afterMove = buildGridMetrics(moved, 356, 356)
  assert(almostEqual(before.cellWidth, afterMove.cellWidth), 'shift keeps cell size')
  const grown = scaleGrid(base, 1)
  const afterGrow = buildGridMetrics(grown, 356, 356)
  assert(afterGrow.cellWidth > before.cellWidth, 'grow enlarges cell')
  assert(gridStillFits(grown, 356, 356), 'grown still fits')
}

process.stdout.write('grid pin checks passed\n')
