import { almostEqual } from '../src/utils/math.ts'
import { buildGridMetrics, gridFromCellCenters, suggestPixelGrid } from '../src/models/grid.ts'

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
  const first = origin + cell / 2
  const last = origin + (n - 1) * cell + cell / 2
  const size = origin * 2 + n * cell
  const spec = gridFromCellCenters(
    { worldX: first, worldY: first },
    { worldX: last, worldY: last },
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
  const swapped = gridFromCellCenters(
    { worldX: 333, worldY: 333 },
    { worldX: 23, worldY: 23 },
    32,
    32,
    356,
    356,
  )
  assert(Boolean(swapped), 'swapped points work')
  assert(almostEqual(swapped!.insetLeft, 18), 'swapped insetLeft')
}

assert(gridFromCellCenters({ worldX: 10, worldY: 10 }, { worldX: 11, worldY: 11 }, 32, 32, 400, 400) === null, 'too close')
assert(gridFromCellCenters({ worldX: 10, worldY: 10 }, { worldX: 200, worldY: 200 }, 1, 32, 400, 400) === null, 'single row rejected')

process.stdout.write('grid pin checks passed\n')
