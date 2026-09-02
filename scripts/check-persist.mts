import { almostEqual } from '../src/utils/math.ts'
import { cameraToView, decodeCompleted, encodeCompleted, offsetsFromView } from '../src/persist/view.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const cam = {
  scale: 2,
  minScale: 0.1,
  maxScale: 8,
  offsetX: 40,
  offsetY: -12,
  cssWidth: 800,
  cssHeight: 600,
  dpr: 1,
}

const view = cameraToView(cam)
assert(Boolean(view), 'view from camera')
if (!view) throw new Error('view')
assert(almostEqual(view.centerX, (800 / 2 - 40) / 2), 'centerX')
assert(almostEqual(view.centerY, (600 / 2 - -12) / 2), 'centerY')

const back = offsetsFromView(view, 800, 600)
assert(almostEqual(back.offsetX, 40), 'roundtrip offsetX')
assert(almostEqual(back.offsetY, -12), 'roundtrip offsetY')

assert(cameraToView({ ...cam, cssWidth: 0 }) === null, 'skip unsized camera')

const packed = encodeCompleted([1, 8, 361])
assert(packed.length === 3 && packed[1] === 8, 'encode completed')
assert(decodeCompleted(packed).join(',') === '1,8,361', 'decode completed')
assert(decodeCompleted(null).length === 0, 'decode empty')

process.stdout.write('persist checks passed\n')
