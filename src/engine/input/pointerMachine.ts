import type { CanvasPt } from '@/models/types'
import { hypot } from '@/utils/math'

export const TAP_SLOP = 5

type Gesture = 'idle' | 'pending' | 'pan' | 'pinch'

type PointerSample = {
  id: number
  canvasX: number
  canvasY: number
}

export type PointerBridge = {
  panBy: (dx: number, dy: number) => void
  zoomPinch: (anchor: CanvasPt, factor: number, followDx: number, followDy: number) => void
  tap: (point: CanvasPt) => void
  doubleTap: (point: CanvasPt) => void
}

export class PointerMachine {
  private gesture: Gesture = 'idle'
  private pointers = new Map<number, PointerSample>()
  private start: CanvasPt | null = null
  private last: CanvasPt | null = null
  private pinchMid: CanvasPt | null = null
  private pinchDist = 0
  private lastTapAt = 0
  private lastTapPoint: CanvasPt | null = null
  private readonly bridge: PointerBridge

  constructor(bridge: PointerBridge) {
    this.bridge = bridge
  }

  down(id: number, point: CanvasPt): void {
    this.pointers.set(id, { id, ...point })

    if (this.pointers.size >= 2) {
      this.beginPinch()
      return
    }

    this.gesture = 'pending'
    this.start = point
    this.last = point
  }

  move(id: number, point: CanvasPt): void {
    if (!this.pointers.has(id)) return
    this.pointers.set(id, { id, ...point })

    if (this.pointers.size >= 2 || this.gesture === 'pinch') {
      this.updatePinch()
      return
    }

    if (!this.start || !this.last) return

    if (this.gesture === 'pending') {
      const moved = hypot(point.canvasX - this.start.canvasX, point.canvasY - this.start.canvasY)
      if (moved > TAP_SLOP) this.gesture = 'pan'
    }

    if (this.gesture === 'pan') {
      this.bridge.panBy(point.canvasX - this.last.canvasX, point.canvasY - this.last.canvasY)
    }

    this.last = point
  }

  up(id: number, point: CanvasPt): void {
    this.pointers.delete(id)

    if (this.gesture === 'pinch') {
      if (this.pointers.size >= 2) {
        this.beginPinch()
        return
      }
      this.reset()
      return
    }

    if (this.gesture === 'pending' && this.start) {
      const moved = hypot(point.canvasX - this.start.canvasX, point.canvasY - this.start.canvasY)
      if (moved <= TAP_SLOP) this.emitTap(this.start)
    }

    this.reset()
  }

  cancel(): void {
    this.pointers.clear()
    this.reset()
  }

  private beginPinch(): void {
    const pair = this.pair()
    if (!pair) return
    this.gesture = 'pinch'
    this.pinchMid = midpoint(pair[0], pair[1])
    this.pinchDist = distance(pair[0], pair[1])
  }

  private updatePinch(): void {
    const pair = this.pair()
    if (!pair || !this.pinchMid || this.pinchDist <= 0) return

    const mid = midpoint(pair[0], pair[1])
    const dist = Math.max(1, distance(pair[0], pair[1]))
    const factor = dist / this.pinchDist
    const followDx = mid.canvasX - this.pinchMid.canvasX
    const followDy = mid.canvasY - this.pinchMid.canvasY

    this.bridge.zoomPinch(this.pinchMid, factor, followDx, followDy)
    this.pinchMid = mid
    this.pinchDist = dist
  }

  private emitTap(point: CanvasPt): void {
    const now = performance.now()
    if (
      this.lastTapPoint &&
      now - this.lastTapAt < 280 &&
      hypot(point.canvasX - this.lastTapPoint.canvasX, point.canvasY - this.lastTapPoint.canvasY) <= 24
    ) {
      this.bridge.doubleTap(point)
      this.lastTapAt = 0
      this.lastTapPoint = null
      return
    }

    this.lastTapAt = now
    this.lastTapPoint = point
    this.bridge.tap(point)
  }

  private pair(): [PointerSample, PointerSample] | null {
    if (this.pointers.size < 2) return null
    const next = this.pointers.values()
    const a = next.next().value
    const b = next.next().value
    if (!a || !b) return null
    return [a, b]
  }

  private reset(): void {
    this.gesture = 'idle'
    this.start = null
    this.last = null
    this.pinchMid = null
    this.pinchDist = 0
  }
}

function midpoint(a: PointerSample, b: PointerSample): CanvasPt {
  return {
    canvasX: (a.canvasX + b.canvasX) / 2,
    canvasY: (a.canvasY + b.canvasY) / 2,
  }
}

function distance(a: PointerSample, b: PointerSample): number {
  return hypot(a.canvasX - b.canvasX, a.canvasY - b.canvasY)
}
