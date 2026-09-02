import type { Layer, LayerContext } from '@/engine/layers/types'

export class ImageLayer implements Layer {
  readonly name = 'image'

  draw(lc: LayerContext): void {
    const { ctx, camera, image } = lc
    ctx.imageSmoothingEnabled = camera.scale < 1
    ctx.imageSmoothingQuality = 'low'
    ctx.drawImage(image.bitmap, 0, 0, image.width, image.height)
  }
}
