export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function hypot(dx: number, dy: number): number {
  return Math.hypot(dx, dy)
}

export function almostEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps
}
