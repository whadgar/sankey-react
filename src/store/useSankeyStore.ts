import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Link } from '../types'

export const DEFAULT_PALETTE = [
  '#4C78A8', '#F58518', '#E45756', '#72B7B2', '#54A24B',
  '#EECA3B', '#B279A2', '#FF9DA6', '#9D755D', '#BAB0AC',
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
]

interface SankeyStore {
  links: Link[]
  nodeColors: Record<string, string>
  nodeLabels: Record<string, string>
  scopeToSource: boolean

  // Actions
  addLinks: (newLinks: Link[], scopedLabels: Record<string, string>) => void
  removeLink: (index: number) => void
  updateLink: (index: number, link: Link) => void
  setNodeColor: (node: string, color: string) => void
  setNodeLabel: (node: string, label: string) => void
  setScopeToSource: (val: boolean) => void
  loadState: (state: { links: Link[]; nodeColors: Record<string, string>; nodeLabels: Record<string, string> }) => void
  clearAll: () => void
  ensureNodeDefaults: (nodes: string[]) => void
}

export const useSankeyStore = create<SankeyStore>()(
  persist(
    (set, get) => ({
      links: [],
      nodeColors: {},
      nodeLabels: {},
      scopeToSource: false,

      addLinks: (newLinks, scopedLabels) => {
        const state = get()
        const existing = state.links
        const toAdd = newLinks.filter(
          nl => !existing.some(el => el.source === nl.source && el.target === nl.target)
            && nl.source !== nl.target
        )
        const mergedLabels = { ...state.nodeLabels, ...scopedLabels }
        set({ links: [...existing, ...toAdd], nodeLabels: mergedLabels })
        // Auto-assign colors for new nodes
        get().ensureNodeDefaults(getUniqueNodes([...existing, ...toAdd]))
      },

      removeLink: (index) =>
        set(s => ({ links: s.links.filter((_, i) => i !== index) })),

      updateLink: (index, link) =>
        set(s => ({ links: s.links.map((l, i) => (i === index ? link : l)) })),

      setNodeColor: (node, color) =>
        set(s => ({ nodeColors: { ...s.nodeColors, [node]: color } })),

      setNodeLabel: (node, label) =>
        set(s => ({ nodeLabels: { ...s.nodeLabels, [node]: label } })),

      setScopeToSource: (val) => set({ scopeToSource: val }),

      loadState: ({ links, nodeColors, nodeLabels }) => {
        set({ links, nodeColors, nodeLabels })
        get().ensureNodeDefaults(getUniqueNodes(links))
      },

      clearAll: () => set({ links: [], nodeColors: {}, nodeLabels: {}, scopeToSource: false }),

      ensureNodeDefaults: (nodes) => {
        const { nodeColors, nodeLabels } = get()
        const newColors = { ...nodeColors }
        const newLabels = { ...nodeLabels }
        let colorIdx = Object.keys(newColors).length
        nodes.forEach(n => {
          if (!newColors[n]) {
            newColors[n] = DEFAULT_PALETTE[colorIdx % DEFAULT_PALETTE.length]
            colorIdx++
          }
          if (!newLabels[n]) newLabels[n] = n
        })
        set({ nodeColors: newColors, nodeLabels: newLabels })
      },
    }),
    { name: 'sankey-store' }  // persists to localStorage automatically
  )
)

export function getUniqueNodes(links: Link[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  links.forEach(l => {
    [l.source, l.target].forEach(n => {
      if (!seen.has(n)) { seen.add(n); ordered.push(n) }
    })
  })
  return ordered
}
