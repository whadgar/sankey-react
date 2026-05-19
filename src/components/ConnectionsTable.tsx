import { useState } from 'react'
import { useSankeyStore, getUniqueNodes } from '../store/useSankeyStore'
import { downloadCSV } from '../utils/exportHelpers'
import type { Link } from '../types'

export default function ConnectionsTable() {
  const links = useSankeyStore(s => s.links)
  const removeLink = useSankeyStore(s => s.removeLink)
  const updateLink = useSankeyStore(s => s.updateLink)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editBuf, setEditBuf] = useState<Link>({ source: '', target: '', value: 0 })
  const [open, setOpen] = useState(false)

  // All node names for the dropdowns
  const allNodes = getUniqueNodes(links)

  if (!links.length) return null

  const startEdit = (i: number) => {
    setEditingIdx(i)
    setEditBuf({ ...links[i] })
  }

  const commitEdit = () => {
    if (editingIdx !== null) updateLink(editingIdx, editBuf)
    setEditingIdx(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition"
      >
        <span>Manage connections ({links.length})</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-left font-medium">Target</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((l, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/40`}>
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    {editingIdx === i ? (
                      <>
                        <td className="px-2 py-1">
                          <select
                            className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs focus:outline-none"
                            value={editBuf.source}
                            onChange={e => setEditBuf(b => ({ ...b, source: e.target.value }))}
                          >
                            {allNodes.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs focus:outline-none"
                            value={editBuf.target}
                            onChange={e => setEditBuf(b => ({ ...b, target: e.target.value }))}
                          >
                            {allNodes.filter(n => n !== editBuf.source).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            className="w-full rounded border border-blue-300 px-2 py-1 text-xs text-right focus:outline-none"
                            value={editBuf.value}
                            onChange={e => setEditBuf(b => ({ ...b, value: +e.target.value }))}
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button onClick={commitEdit} className="mr-1 rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700">Save</button>
                          <button onClick={() => setEditingIdx(null)} className="rounded bg-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-300">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{l.source}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 max-w-[140px] truncate">{l.target}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{l.value.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => startEdit(i)} className="mr-1 rounded px-2 py-1 text-blue-600 hover:bg-blue-50">Edit</button>
                          <button onClick={() => removeLink(i)} className="rounded px-2 py-1 text-red-500 hover:bg-red-50">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              onClick={() => downloadCSV(links, 'sankey_data.csv')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
