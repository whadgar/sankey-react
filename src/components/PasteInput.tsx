import { useState, useMemo } from 'react'
import { useSankeyStore } from '../store/useSankeyStore'
import { parseExcelPaste, parseHierarchyPaste } from '../utils/parseExcelPaste'
import type { Link } from '../types'

interface Props {
  sourceName: string
  onAdded: () => void
}

type PasteMode = 'normal' | 'multibranch' | 'chain'

function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-1'}`} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
      {hint && <span className="text-slate-400 cursor-help text-xs" title={hint}>(?)</span>}
    </label>
  )
}

const MODES: { key: PasteMode; label: string; desc: string }[] = [
  { key: 'normal',      label: 'Normal',       desc: 'Source → one target per row' },
  { key: 'multibranch', label: 'Multi-branch',  desc: 'Source → many targets at once' },
  { key: 'chain',       label: 'Chain',         desc: 'Auto-build A → B → C hierarchy' },
]

export default function PasteInput({ sourceName, onAdded }: Props) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<PasteMode>('normal')
  const scopeToSource = useSankeyStore(s => s.scopeToSource)
  const setScopeToSource = useSankeyStore(s => s.setScopeToSource)
  const addLinks = useSankeyStore(s => s.addLinks)

  const isChain  = mode === 'chain'
  const isFanout = mode === 'multibranch'

  // ── Parse ─────────────────────────────────────────────────────────────────
  const normalParsed    = useMemo(() => parseExcelPaste(text),     [text])
  const hierarchyParsed = useMemo(() => parseHierarchyPaste(text), [text])

  // Normal / multi-branch preview — both use same parser, same source
  const fanPreview = useMemo(() => {
    if (!normalParsed.rows.length) return []
    return normalParsed.rows.map(r => ({
      source: sourceName || '—',
      target: scopeToSource && sourceName ? `${r.name} [${sourceName}]` : r.name,
      value: r.value,
    }))
  }, [normalParsed.rows, sourceName, scopeToSource])

  // Chain preview — respects scope-to-source when ON
  const chainPreview = useMemo(() => {
    const { nodes: cNodes, links: cLinks } = hierarchyParsed
    if (!cNodes.length) return []

    const scope = (name: string) =>
      scopeToSource && sourceName ? `${name} [${sourceName}]` : name

    const rows: { source: string; target: string; value: number }[] = []

    // Entry link: selected source → first chain node
    if (sourceName) {
      rows.push({ source: sourceName, target: scope(cNodes[0].name), value: cNodes[0].value })
    }
    // Internal chain links (with scoping applied to both ends)
    cLinks.forEach(l => {
      rows.push({ source: scope(l.source), target: scope(l.target), value: l.value })
    })
    return rows
  }, [hierarchyParsed, sourceName, scopeToSource])

  const previewRows = isChain ? chainPreview : fanPreview
  const parseOk     = isChain ? hierarchyParsed.links.length > 0 : normalParsed.rows.length > 0
  const canAdd      = isChain ? parseOk : (!!sourceName && parseOk)

  const delimiter = isChain ? hierarchyParsed.delimiter : normalParsed.delimiter

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!canAdd) return
    if (isChain) {
      const { nodes: cNodes, links: cLinks } = hierarchyParsed
      const toAdd: Link[] = []
      const scopedLabels: Record<string, string> = {}

      const scope = (name: string) => {
        if (scopeToSource && sourceName) {
          const scoped = `${name} [${sourceName}]`
          scopedLabels[scoped] = name   // display label = original name
          return scoped
        }
        return name
      }

      // Entry link: selected source → first chain node (scoped)
      if (sourceName && cNodes.length > 0) {
        toAdd.push({ source: sourceName, target: scope(cNodes[0].name), value: cNodes[0].value })
      }
      // Internal chain links — scope both ends
      cLinks.forEach(l => {
        toAdd.push({ source: scope(l.source), target: scope(l.target), value: l.value })
      })

      addLinks(toAdd, scopedLabels)
    } else {
      if (!sourceName) return
      const newLinks: Link[] = []
      const scopedLabels: Record<string, string> = {}
      normalParsed.rows.forEach(r => {
        const target = scopeToSource ? `${r.name} [${sourceName}]` : r.name
        newLinks.push({ source: sourceName, target, value: r.value })
        if (scopeToSource) scopedLabels[target] = r.name
      })
      addLinks(newLinks, scopedLabels)
    }
    setText('')
    onAdded()
  }

  // ── Placeholders ──────────────────────────────────────────────────────────
  const placeholder = {
    normal:      'Name\tValue  (one target per row)\n\nUser Guidance Ticket\t74\nOther Incidents\t148',
    multibranch: 'Paste all targets in one go — names row then values row:\n\nbypassed GS\tdata gap\tformality question\n20\t5\t2',
    chain:       'Names row then values row — chain is built left→right:\n\nTotal Incidents\tTotal user Guidance\tTotal incidents\n222\t74\t28',
  }[mode]

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <label className="block text-sm font-semibold text-slate-700">Step 2 — Paste data</label>
        <button onClick={() => setText('')} className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          Clear
        </button>
      </div>

      {/* Mode selector */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setText('') }}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              mode === m.key
                ? m.key === 'chain'       ? 'bg-violet-600 text-white shadow-sm'
                : m.key === 'multibranch' ? 'bg-emerald-600 text-white shadow-sm'
                :                           'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode description */}
      <p className="text-xs text-slate-500">
        {MODES.find(m => m.key === mode)?.desc}
        {isFanout && sourceName && (
          <span className="ml-1 font-medium text-emerald-700">— all targets connect to <strong>{sourceName}</strong></span>
        )}
        {isChain && sourceName && (
          <span className="ml-1 font-medium text-violet-700">— entry point: <strong>{sourceName}</strong></span>
        )}
      </p>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      {/* Scope toggle — available in ALL modes */}
      <Toggle
        on={scopeToSource}
        onToggle={() => setScopeToSource(!scopeToSource)}
        label="Keep targets unique per source"
        hint="ON: nodes are stored as 'Total Incidents [Oct]' / 'Total Incidents [Nov]' — stays separate per month. OFF: same-named nodes merge into one shared node."
      />
      {scopeToSource && sourceName && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
          {isChain
            ? <>All chain nodes scoped as <code>Name [{sourceName}]</code> — display labels stay clean.</>
            : <>Targets scoped as <code>Name [{sourceName}]</code></>
          }
        </p>
      )}

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-slate-600">Preview</p>
            {isChain  && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-600">chain</span>}
            {isFanout && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">fan-out</span>}
            {delimiter && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{delimiter}-separated</span>}
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 text-xs">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-left font-medium">Target</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-2 text-slate-600">{r.source}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.target}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{r.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {text.trim() && !parseOk && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {isChain
            ? 'Could not build chain. Paste names on row 1 and values on row 2.'
            : 'Could not parse. Ensure a Name column and a numeric Value column are present.'}
        </p>
      )}

      <button
        onClick={handleAdd}
        disabled={!canAdd}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
          isChain  ? 'bg-violet-600 hover:bg-violet-700' :
          isFanout ? 'bg-emerald-600 hover:bg-emerald-700' :
                     'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isChain ? 'Build hierarchy chain' : isFanout ? 'Add all branches' : 'Add connections'}
      </button>
    </div>
  )
}
