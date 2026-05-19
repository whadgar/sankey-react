import { useRef, useCallback, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useSankeyStore, getUniqueNodes } from '../store/useSankeyStore'
import { downloadPNG, downloadHTML } from '../utils/exportHelpers'
import type { Link } from '../types'

/** BFS: returns all nodes reachable downstream from `start` (including itself) */
function getDownstream(start: string, links: Link[]): Set<string> {
  const visited = new Set<string>([start])
  const queue = [start]
  while (queue.length) {
    const curr = queue.shift()!
    for (const l of links) {
      if (l.source === curr && !visited.has(l.target)) {
        visited.add(l.target)
        queue.push(l.target)
      }
    }
  }
  return visited
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function SankeyChart() {
  const chartRef = useRef<ReactECharts>(null)
  const links = useSankeyStore(s => s.links)
  const nodeColors = useSankeyStore(s => s.nodeColors)
  const nodeLabels = useSankeyStore(s => s.nodeLabels)

  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [heightPerNode, setHeightPerNode] = useState(52)   // px per node, user-adjustable

  const nodes = getUniqueNodes(links)

  // Dynamic height driven by the slider
  const dynamicHeight = Math.max(400, nodes.length * heightPerNode)

  // Compute per-node totals for label display
  const outflow: Record<string, number> = {}
  const inflow:  Record<string, number> = {}
  nodes.forEach(n => { outflow[n] = 0; inflow[n] = 0 })
  links.forEach(l => {
    outflow[l.source] = (outflow[l.source] || 0) + l.value
    inflow[l.target]  = (inflow[l.target]  || 0) + l.value
  })
  const nodeTotal = (n: string) => outflow[n] > 0 ? outflow[n] : inflow[n]

  const validLinks = links.filter(l => l.value > 0 && nodes.includes(l.source) && nodes.includes(l.target))

  // Full downstream set of the hovered node (null = nothing hovered)
  const downstream = useMemo(
    () => hoveredNode ? getDownstream(hoveredNode, validLinks) : null,
    [hoveredNode, validLinks]
  )

  const option = {
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: { dataType: string; name: string; value: number; data: { source: string; target: string; value: number } }) => {
        if (params.dataType === 'node') {
          return `<strong>${params.name}</strong><br/>Total: ${fmt(nodeTotal(params.name))}`
        }
        return `<strong>${params.data.source}</strong> → <strong>${params.data.target}</strong><br/>Value: ${fmt(params.value)}`
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'none' },   // we handle highlight ourselves
        nodeWidth: 20,
        nodeGap: 14,
        left: '2%',
        right: '26%',
        top: '3%',
        bottom: '3%',
        // ── Node label: series-level formatter so it always renders ──
        label: {
          position: 'right',
          formatter: (params: { name: string }) => {
            const n = params.name
            return [
              `{name|${nodeLabels[n] || n}}`,
              `{value|${fmt(nodeTotal(n))}}`,
            ].join('\n')
          },
          rich: {
            name:  { fontSize: 11, fontWeight: 'bold',   color: '#1e293b', lineHeight: 16 },
            value: { fontSize: 10, fontWeight: 'normal', color: '#64748b', lineHeight: 14 },
          },
        },
        data: nodes.map(n => {
          const inPath    = downstream ? downstream.has(n) : true
          const isHovered = n === hoveredNode
          return {
            name: n,
            itemStyle: {
              color:       nodeColors[n] || '#4C78A8',
              opacity:     inPath ? 1 : 0.15,
              borderWidth: isHovered ? 2 : 0,
              borderColor: '#1e293b',
            },
            // Only override label colour per node; formatter stays at series level
            label: {
              rich: {
                name:  { fontSize: 11, lineHeight: 16, color: inPath ? '#1e293b' : '#94a3b8' },
                value: { fontSize: 10, lineHeight: 14, color: inPath ? '#64748b' : '#c0cad4' },
              },
            },
          }
        }),
        links: validLinks.map(l => {
          const inPath = downstream
            ? downstream.has(l.source) && downstream.has(l.target)
            : true
          return {
            source: l.source,
            target: l.target,
            value:  l.value,
            lineStyle: {
              color:   'gradient',
              opacity: inPath ? 0.55 : 0.05,
            },
            label: {
              show:      true,
              formatter: () => fmt(l.value),
              fontSize:  11,
              color:     inPath ? '#475569' : 'transparent',
            },
          }
        }),
        lineStyle: { curveness: 0.5 },
      },
    ],
  }

  // ECharts mouse event handlers
  const onEvents = useMemo(() => ({
    mouseover: (params: { dataType?: string; name?: string }) => {
      if (params.dataType === 'node' && params.name) setHoveredNode(params.name)
    },
    mouseout: () => setHoveredNode(null),
  }), [])

  const handleDownloadPNG = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance()
    if (!instance) return
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    downloadPNG(url, 'sankey_diagram.png')
  }, [])

  const handleDownloadHTML = useCallback(() => {
    // JSON.stringify drops functions, so we build a fully-serializable option:
    // every formatter is a pre-baked string using the display label + formatted value.
    const richStyles = {
      name:  { fontSize: 11, fontWeight: 'bold',   color: '#1e293b', lineHeight: 16 },
      value: { fontSize: 10, fontWeight: 'normal', color: '#64748b', lineHeight: 14 },
    }
    const exportOption = {
      backgroundColor: '#ffffff',
      tooltip: { trigger: 'item' },          // default ECharts tooltip – no function needed
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },    // re-enable built-in highlight for the HTML file
        nodeWidth: 20,
        nodeGap: 14,
        left: '2%',
        right: '26%',
        top: '3%',
        bottom: '3%',
        label: { position: 'right', rich: richStyles },
        lineStyle: { curveness: 0.5 },
        // Per-node: display name + value baked into formatter string (no function)
        data: nodes.map(n => ({
          name: n,
          itemStyle: { color: nodeColors[n] || '#4C78A8', opacity: 1, borderWidth: 0 },
          label: {
            formatter: `{name|${nodeLabels[n] || n}}\n{value|${fmt(nodeTotal(n))}}`,
            rich: richStyles,
          },
        })),
        // Per-link: value pre-formatted as plain string
        links: validLinks.map(l => ({
          source: l.source,
          target: l.target,
          value:  l.value,
          lineStyle: { color: 'gradient', opacity: 0.55 },
          label: { show: true, formatter: fmt(l.value), fontSize: 11, color: '#475569' },
        })),
      }],
    }
    downloadHTML(exportOption, dynamicHeight, 'sankey_diagram.html')
  }, [nodes, nodeColors, nodeLabels, nodeTotal, validLinks, dynamicHeight])

  if (nodes.length < 2 || validLinks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white">
        <p className="text-sm text-slate-400">Your diagram will appear here once you add connections above.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* ── Chart controls bar ── */}
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2">
        <span className="shrink-0 text-xs font-medium text-slate-600">Chart height</span>
        <input
          type="range"
          min={20}
          max={120}
          step={2}
          value={heightPerNode}
          onChange={e => setHeightPerNode(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-500">
          {dynamicHeight} px&nbsp;
          <span className="text-slate-400">({nodes.length} nodes × {heightPerNode})</span>
        </span>
      </div>

      <ReactECharts
        ref={chartRef}
        option={option}
        onEvents={onEvents}
        style={{ height: `${dynamicHeight}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />

      <div className="flex gap-2 border-t border-slate-100 px-4 py-3 bg-slate-50">
        <button
          onClick={handleDownloadPNG}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Download PNG
        </button>
        <button
          onClick={handleDownloadHTML}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Download HTML
        </button>
      </div>
    </div>
  )
}
