import { countCells, span } from '../src/engine/count.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const cases = [
  { start: { row: 8, col: 12 }, end: { row: 8, col: 15 }, colSpan: 4, rowSpan: 1, total: 4 },
  { start: { row: 8, col: 15 }, end: { row: 8, col: 12 }, colSpan: 4, rowSpan: 1, total: 4 },
  { start: { row: 3, col: 10 }, end: { row: 7, col: 10 }, colSpan: 1, rowSpan: 5, total: 5 },
  { start: { row: 7, col: 10 }, end: { row: 3, col: 10 }, colSpan: 1, rowSpan: 5, total: 5 },
  { start: { row: 8, col: 12 }, end: { row: 11, col: 16 }, colSpan: 5, rowSpan: 4, total: 20 },
  { start: { row: 11, col: 16 }, end: { row: 8, col: 12 }, colSpan: 5, rowSpan: 4, total: 20 },
  { start: { row: 8, col: 12 }, end: { row: 8, col: 12 }, colSpan: 1, rowSpan: 1, total: 1 },
]

for (const item of cases) {
  const result = countCells(item.start, item.end)
  assert(result.colSpan === item.colSpan, `colSpan ${JSON.stringify(item)}`)
  assert(result.rowSpan === item.rowSpan, `rowSpan ${JSON.stringify(item)}`)
  assert(result.total === item.total, `total ${JSON.stringify(item)}`)
  assert(result.colSpan > 0 && result.rowSpan > 0 && result.total > 0, 'no negatives')
}

assert(span(12, 15) === 4, 'ltr')
assert(span(15, 12) === 4, 'rtl')
assert(span(3, 7) === 5, 'ttb')
assert(span(7, 3) === 5, 'btt')

process.stdout.write('count checks passed\n')
