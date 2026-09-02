export const HISTORY_LIMIT = 50

export type CompleteCommand = {
  ids: readonly number[]
  value: boolean
}

export function applyComplete(
  completed: ReadonlySet<number>,
  ids: readonly number[],
  value: boolean,
): Set<number> {
  const next = new Set(completed)
  for (const id of ids) {
    if (value) next.add(id)
    else next.delete(id)
  }
  return next
}

export function pushLimited<T>(stack: readonly T[], item: T, limit: number): T[] {
  const next = [...stack, item]
  if (next.length > limit) return next.slice(next.length - limit)
  return next
}
