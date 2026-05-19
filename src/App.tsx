import { useState } from 'react'
import SourceSelector from './components/SourceSelector'
import PasteInput from './components/PasteInput'
import SankeyChart from './components/SankeyChart'
import NodeCustomiser from './components/NodeCustomiser'
import ConnectionsTable from './components/ConnectionsTable'
import Toolbar from './components/Toolbar'

export default function App() {
  const [sourceName, setSourceName] = useState('')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Sankey Diagram Builder</h1>
            <p className="text-xs text-slate-500">Paste from Excel • Live preview • Export PNG / HTML / JSON</p>
          </div>
          <Toolbar />
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-6 py-6 flex gap-6">

        {/* ── Left sidebar ── */}
        <aside className="w-72 shrink-0 space-y-5">

          {/* Connection builder card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-5">
            <SourceSelector value={sourceName} onChange={setSourceName} />
            <hr className="border-slate-100" />
            <PasteInput sourceName={sourceName} onAdded={() => setSourceName('')} />
          </div>

          {/* Node customiser card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Node Colours</h2>
            <NodeCustomiser />
          </div>

        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 space-y-5">
          <SankeyChart />
          <ConnectionsTable />
        </main>

      </div>
    </div>
  )
}
