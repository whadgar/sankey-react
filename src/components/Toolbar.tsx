import { useRef } from 'react'
import { useSankeyStore, getUniqueNodes } from '../store/useSankeyStore'
import { downloadJSON } from '../utils/exportHelpers'

export default function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const links = useSankeyStore(s => s.links)
  const nodeColors = useSankeyStore(s => s.nodeColors)
  const nodeLabels = useSankeyStore(s => s.nodeLabels)
  const loadState = useSankeyStore(s => s.loadState)
  const clearAll = useSankeyStore(s => s.clearAll)

  const handleSave = () => {
    downloadJSON({ links, nodeColors, nodeLabels }, 'sankey_state.json')
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        loadState(data)
      } catch {
        alert('Could not parse file. Make sure it is a valid sankey_state.json.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const nodes = getUniqueNodes(links)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleSave}
        disabled={!links.length}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
      >
        Save state (JSON)
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        Load state (JSON)
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleLoad} />

      {nodes.length > 0 && (
        <button
          onClick={() => { if (confirm('Clear everything and start over?')) clearAll() }}
          className="ml-auto rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
