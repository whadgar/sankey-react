import { useState } from 'react'
import { getUniqueNodes, useSankeyStore } from '../store/useSankeyStore'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function SourceSelector({ value, onChange }: Props) {
  const links = useSankeyStore(s => s.links)
  const nodes = getUniqueNodes(links)
  const [isNew, setIsNew] = useState(nodes.length === 0)

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__new__') {
      setIsNew(true)
      onChange('')
    } else {
      setIsNew(false)
      onChange(e.target.value)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        Step 1 — Choose a source node
      </label>

      {nodes.length > 0 && (
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={isNew ? '__new__' : value}
          onChange={handleSelect}
        >
          {nodes.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
          <option value="__new__">+ Add new node…</option>
        </select>
      )}

      {(isNew || nodes.length === 0) && (
        <input
          type="text"
          placeholder="e.g. Total Incidents"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      )}

      {value && (
        <p className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
          Source: <strong>{value}</strong>
        </p>
      )}
    </div>
  )
}
