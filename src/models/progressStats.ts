export function completionPercent(done: number, total: number): number {
  if (total <= 0 || done <= 0) return 0
  return Math.round((done / total) * 100)
}
