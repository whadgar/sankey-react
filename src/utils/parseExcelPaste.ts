import type { ParsedRow, Link } from '../types'

function isNumber(s: string): boolean {
  return s.trim() !== '' && !isNaN(Number(s.replace(/,/g, '')))
}

function toNum(s: string): number {
  return parseFloat(s.replace(/,/g, ''))
}

function tryVertical(grid: string[][]): ParsedRow[] {
  const out: ParsedRow[] = []
  for (const row of grid) {
    if (row.length < 2) continue
    const name = row[0].trim()
    if (!name || isNumber(name)) continue
    if (isNumber(row[1])) out.push({ name, value: toNum(row[1]) })
  }
  return out
}

function tryHorizontal(grid: string[][]): ParsedRow[] {
  if (grid.length < 2) return []
  const pairs: [number, number][] = [[0, 1], [1, 0]]
  for (const [ni, vi] of pairs) {
    if (ni >= grid.length || vi >= grid.length) continue
    const nameRow = grid[ni]
    const valRow = grid[vi]
    const out: ParsedRow[] = []
    for (let i = 0; i < Math.min(nameRow.length, valRow.length); i++) {
      const name = nameRow[i].trim()
      const val = valRow[i].trim()
      if (name && !isNumber(name) && isNumber(val)) {
        out.push({ name, value: toNum(val) })
      }
    }
    if (out.length) return out
  }
  return []
}

export interface ParseResult {
  rows: ParsedRow[]
  orientation: 'vertical' | 'horizontal' | ''
  delimiter: 'tab' | 'comma' | ''
}

export function parseExcelPaste(text: string): ParseResult {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
  if (!lines.length) return { rows: [], orientation: '', delimiter: '' }

  const hasTab = lines.some(l => l.includes('\t'))
  const delimiter: 'tab' | 'comma' = hasTab ? 'tab' : 'comma'
  const sep = hasTab ? '\t' : ','

  const grid = lines.map(l => l.split(sep).map(c => c.trim()))

  const numCols = Math.max(...grid.map(r => r.length))
  const numRows = grid.length

  if (numCols === 2) {
    const r = tryVertical(grid)
    if (r.length) return { rows: r, orientation: 'vertical', delimiter }
  }
  if (numRows === 2) {
    const r = tryHorizontal(grid)
    if (r.length) return { rows: r, orientation: 'horizontal', delimiter }
  }

  const r1 = tryVertical(grid)
  if (r1.length) return { rows: r1, orientation: 'vertical', delimiter }

  const r2 = tryHorizontal(grid)
  if (r2.length) return { rows: r2, orientation: 'horizontal', delimiter }

  return { rows: [], orientation: '', delimiter }
}

// ── Hierarchy / Chain parser ──────────────────────────────────────────────────
// Turns a multi-column paste into a LEFT → RIGHT chain of links.
//
// Horizontal (names row + values row):
//   Total Incidents  Total user Guidance  Total incidents with usecase
//   222              74                   28
//   → links: [Total Incidents→Total user Guidance, 74]
//            [Total user Guidance→Total incidents with usecase, 28]
//
// Vertical (name-value pairs down a column):
//   Total Incidents    222
//   Total user Guidance 74
//   → same chain, reading top to bottom

export interface HierarchyResult {
  links: Link[]
  nodes: { name: string; value: number }[]
  delimiter: 'tab' | 'comma' | ''
}

export function parseHierarchyPaste(text: string): HierarchyResult {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
  if (lines.length < 1) return { links: [], nodes: [], delimiter: '' }

  const hasTab = lines.some(l => l.includes('\t'))
  const delimiter: 'tab' | 'comma' = hasTab ? 'tab' : 'comma'
  const sep = hasTab ? '\t' : ','

  const grid = lines.map(l => l.split(sep).map(c => c.trim()))

  let names: string[] = []
  let values: number[] = []

  // ── Try horizontal (names row + values row) ──
  if (grid.length >= 2) {
    for (const [ni, vi] of [[0, 1], [1, 0]] as [number, number][]) {
      const nr = grid[ni]
      const vr = grid[vi]
      if (!isNumber(nr[0]) && isNumber(vr[0])) {
        names  = nr.map(c => c.trim())
        values = vr.map(c => toNum(c))
        break
      }
    }
  }

  // ── Try vertical (name, value per row) ──
  if (names.length < 2) {
    const vn: string[] = [], vv: number[] = []
    for (const row of grid) {
      if (row.length >= 2 && !isNumber(row[0]) && isNumber(row[1])) {
        vn.push(row[0].trim())
        vv.push(toNum(row[1]))
      }
    }
    if (vn.length >= 2) { names = vn; values = vv }
  }

  if (names.length < 2) return { links: [], nodes: [], delimiter }

  const nodes = names.map((name, i) => ({ name, value: values[i] ?? 0 }))

  // Each link's value = value of the TARGET node in the chain
  const links: Link[] = []
  for (let i = 0; i < names.length - 1; i++) {
    const value = values[i + 1]
    if (names[i] && names[i + 1] && !isNaN(value) && value > 0) {
      links.push({ source: names[i], target: names[i + 1], value })
    }
  }

  return { links, nodes, delimiter }
}
