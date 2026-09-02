import { canvasToWorld, screenToWorld, visibleWorldRect, worldRectToCanvas, worldToCanvas } from '../src/engine/coord.ts'
import { centerOffsets, fitWorldCamera, panWorldOffsets } from '../src/engine/camera.ts'
import { almostEqual } from '../src/utils/math.ts'
import type { ViewportState } from '../src/models/types.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const mainCam: ViewportState = {
  scale: 2,
  minScale: 0.2,
  maxScale: 8,
  offsetX: -200,
  offsetY: -80,
  cssWidth: 800,
  cssHeight: 600,
  dpr: 2,
}

const miniCam = fitWorldCamera(120, 120, 1000, 800, 2, 6)

const world = { worldX: 250, worldY: 400 }
const onMini = worldToCanvas(world, miniCam)
const backMini = canvasToWorld(onMini, miniCam)
assert(almostEqual(backMini.worldX, world.worldX), 'mini world round-trip X')
assert(almostEqual(backMini.worldY, world.worldY), 'mini world round-trip Y')

const onMain = worldToCanvas(world, mainCam)
const backMain = canvasToWorld(onMain, mainCam)
assert(almostEqual(backMain.worldX, world.worldX), 'main world round-trip X')
assert(almostEqual(backMain.worldY, world.worldY), 'main world round-trip Y')
assert(almostEqual(backMini.worldX, backMain.worldX), 'mini and main share World X')
assert(almostEqual(backMini.worldY, backMain.worldY), 'mini and main share World Y')

const rect = { left: 40, top: 16 }
const screen = { screenX: onMini.canvasX + rect.left, screenY: onMini.canvasY + rect.top }
const viaScreen = screenToWorld(screen, miniCam, rect)
assert(almostEqual(viaScreen.worldX, world.worldX), 'minimap click uses screenToWorld X')
assert(almostEqual(viaScreen.worldY, world.worldY), 'minimap click uses screenToWorld Y')

const vis = visibleWorldRect(mainCam)
const box = worldRectToCanvas(vis, miniCam)
const tl = canvasToWorld({ canvasX: box.x, canvasY: box.y }, miniCam)
assert(almostEqual(tl.worldX, vis.x), 'view frame top-left X is World')
assert(almostEqual(tl.worldY, vis.y), 'view frame top-left Y is World')
const br = canvasToWorld({ canvasX: box.x + box.w, canvasY: box.y + box.h }, miniCam)
assert(almostEqual(br.worldX, vis.x + vis.w), 'view frame bottom-right X is World')
assert(almostEqual(br.worldY, vis.y + vis.h), 'view frame bottom-right Y is World')

const centered = centerOffsets(mainCam, world)
const centeredCam = { ...mainCam, ...centered }
const mid = canvasToWorld({ canvasX: centeredCam.cssWidth / 2, canvasY: centeredCam.cssHeight / 2 }, centeredCam)
assert(almostEqual(mid.worldX, world.worldX), 'centerOnWorld keeps World under canvas center X')
assert(almostEqual(mid.worldY, world.worldY), 'centerOnWorld keeps World under canvas center Y')

const shifted = panWorldOffsets(mainCam, 40, -15)
const before = canvasToWorld({ canvasX: 100, canvasY: 80 }, mainCam)
const after = canvasToWorld({ canvasX: 100, canvasY: 80 }, { ...mainCam, ...shifted })
assert(almostEqual(after.worldX, before.worldX + 40), 'panWorld moves World X')
assert(almostEqual(after.worldY, before.worldY - 15), 'panWorld moves World Y')

assert(miniCam.scale !== mainCam.scale, 'minimap camera scale is independent')

process.stdout.write('minimap checks passed\n')
