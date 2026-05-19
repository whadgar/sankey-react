import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useSankeyStore, getUniqueNodes } from '../store/useSankeyStore'

export default function NodeCustomiser() {
  const links = useSankeyStore(s => s.links)
  const nodeColors = useSankeyStore(s => s.nodeColors)
  const nodeLabels = useSankeyStore(s => s.nodeLabels)
  const setNodeColor = useSankeyStore(s => s.setNodeColor)
  const setNodeLabel = useSankeyStore(s => s.setNodeLabel)

  const nodes = getUniqueNodes(links)
  const [selected, setSelected] = useState<string>('')

  const activeNode = selected || nodes[0] || ''

  if (!nodes.length) {
    return (
      <p className="text-xs text-slate-400 italic">Add connections to customise nodes.</p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Dropdown */}
      <select
        value={activeNode}
        onChange={e => setSelected(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {nodes.map(n => (
          <option key={n} value={n}>{nodeLabels[n] || n}</option>
        ))}
      </select>

      {activeNode && (
        <div className="space-y-3">
          {/* Label editor */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Display label</label>
            <input
              type="text"
              value={nodeLabels[activeNode] || activeNode}
              onChange={e => setNodeLabel(activeNode, e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Colour</label>
            <HexColorPicker
              color={nodeColors[activeNode] || '#4C78A8'}
              onChange={c => setNodeColor(activeNode, c)}
              style={{ width: '100%', height: '140px' }}
            />
            <input
              type="text"
              value={nodeColors[activeNode] || '#4C78A8'}
              onChange={e => setNodeColor(activeNode, e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Swatch strip */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500">All nodes</p>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {nodes.map(n => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition hover:bg-slate-100 ${
                n === activeNode ? 'bg-slate-100 font-semibold' : ''
              }`}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm shadow-sm"
                style={{ background: nodeColors[n] || '#4C78A8' }}
              />
              <span className="truncate text-slate-700">{nodeLabels[n] || n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
