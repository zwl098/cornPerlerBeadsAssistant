import { applyComplete, HISTORY_LIMIT, pushLimited } from '../src/engine/completeHistory.ts'
import { packCell, unpackCell } from '../src/models/cellId.ts'
import { completionPercent } from '../src/models/progressStats.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(packCell(8, 12, 50) === 361, 'pack 8,12')
assert(unpackCell(361, 50).row === 8 && unpackCell(361, 50).col === 12, 'unpack 8,12')
assert(packCell(1, 1, 29) === 0, 'origin')
assert(unpackCell(0, 29).row === 1 && unpackCell(0, 29).col === 1, 'unpack origin')

assert(completionPercent(356, 1200) === 30, '356/1200 → 30%')
assert(completionPercent(0, 1200) === 0, 'empty percent')
assert(completionPercent(1200, 1200) === 100, 'full percent')
assert(completionPercent(1, 0) === 0, 'zero total')

let completed = new Set<number>()
const id = packCell(2, 3, 10)
completed = applyComplete(completed, [id], true)
assert(completed.has(id), 'mark complete')
completed = applyComplete(completed, [id], false)
assert(!completed.has(id), 'unmark')

const stack = pushLimited([1, 2], 3, 3)
assert(stack.join(',') === '1,2,3', 'push within limit')
const trimmed = pushLimited([1, 2, 3], 4, 3)
assert(trimmed.join(',') === '2,3,4', `history cap ${HISTORY_LIMIT}`)

let marked = new Set<number>()
const a = packCell(1, 1, 4)
const b = packCell(1, 2, 4)
marked = applyComplete(marked, [a], true)
marked = applyComplete(marked, [b], true)
marked = applyComplete(marked, [b], false)
assert(marked.has(a) && !marked.has(b), 'undo last mark')
marked = applyComplete(marked, [b], true)
assert(marked.has(a) && marked.has(b), 'redo last mark')

process.stdout.write('progress checks passed\n')
