# Architecture

## Project Structure

```
sankey-react/
├── src/
│   ├── main.tsx                  # React root — mounts <App />
│   ├── App.tsx                   # Layout shell (header, sidebar, main)
│   ├── types.ts                  # Shared TypeScript interfaces
│   │
│   ├── store/
│   │   └── useSankeyStore.ts     # Zustand store (single source of truth)
│   │
│   ├── components/
│   │   ├── SourceSelector.tsx    # Step 1 — pick / type the source node name
│   │   ├── PasteInput.tsx        # Step 2 — paste data, mode selector, preview
│   │   ├── SankeyChart.tsx       # ECharts Sankey + hover highlight + export buttons
│   │   ├── ConnectionsTable.tsx  # Collapsible table — edit / delete every link
│   │   ├── NodeCustomiser.tsx    # Colour picker + swatch strip
│   │   └── Toolbar.tsx           # Save JSON / Load JSON / Clear all
│   │
│   └── utils/
│       ├── parseExcelPaste.ts    # Excel paste parsers (normal + chain)
│       └── exportHelpers.ts      # PNG / HTML / CSV / JSON download helpers
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── ARCHITECTURE.md
```

---

## Data Flow

```
User pastes text
      │
      ▼
parseExcelPaste / parseHierarchyPaste
  (auto-detect delimiter, orientation)
      │
      ▼
PasteInput builds Link[] + scopedLabels{}
      │
      ▼
useSankeyStore.addLinks()
  ├── deduplicates links
  ├── merges display-label overrides into nodeLabels{}
  └── ensureNodeDefaults() → auto-assigns palette colours
      │
      ▼
Zustand persists state → localStorage
      │
      ▼
SankeyChart reads links / nodeColors / nodeLabels
  ├── getUniqueNodes() — insertion-order node list
  ├── computes per-node inflow / outflow totals
  ├── builds ECharts option (live, with formatter functions)
  └── renders ReactECharts
```

---

## Key Modules

### `useSankeyStore.ts`

Central Zustand store, persisted to `localStorage` via the `persist` middleware under the key `"sankey-store"`.

| State field | Type | Purpose |
|---|---|---|
| `links` | `Link[]` | All source→target→value connections |
| `nodeColors` | `Record<string, string>` | Hex colour per internal node name |
| `nodeLabels` | `Record<string, string>` | Display label per internal node name |
| `scopeToSource` | `boolean` | Whether targets are namespaced by source |

**`addLinks(newLinks, scopedLabels)`** — deduplicates on `(source, target)` key before inserting. `scopedLabels` maps internal scoped names to short display labels (populated when scope-to-source is ON).

**`getUniqueNodes(links)`** — exported helper that walks links in insertion order and returns a deduplicated list. Maintains left-to-right column ordering in the diagram.

---

### `parseExcelPaste.ts`

Two parsers — both detect delimiter (tab preferred, comma fallback) and layout automatically.

#### `parseExcelPaste(text)` → `ParseResult`

Used by **Normal** and **Multi-branch** modes.

```
tryVertical:   col 0 = name, col 1 = numeric value  (one row per target)
tryHorizontal: row 0 = names, row 1 = values         (or swapped)
```

#### `parseHierarchyPaste(text)` → `HierarchyResult`

Used by **Chain** mode. Produces a left-to-right linked list:

```
names:  [A,   B,   C  ]
values: [100, 74,  28 ]
links:  A→B (value=74), B→C (value=28)   ← each link value = TARGET node's value
nodes:  [{name:A, value:100}, ...]        ← used to create the entry link from selected source
```

---

### `PasteInput.tsx`

Manages the three-step "source → paste → add" workflow.

**Mode selector** switches between `normal | multibranch | chain`. Clearing the textarea on mode switch prevents stale previews.

**Scope-to-source** logic (shown in all modes):

```
scope(name) = scopeToSource && sourceName
              ? `${name} [${sourceName}]`   // internal key
              : name
```

`scopedLabels[scoped] = name` captures the display-label override that gets merged into the store's `nodeLabels`.

**Chain mode add sequence:**
1. Entry link: `sourceName → scope(cNodes[0].name)`, value = `cNodes[0].value`
2. Internal links: `scope(l.source) → scope(l.target)` for each parsed chain link

---

### `SankeyChart.tsx`

**Two option objects exist at runtime:**

| Object | Purpose |
|---|---|
| `option` (inline) | Live chart — uses JS formatter functions for labels/tooltips; supports hover state |
| `exportOption` (built in `handleDownloadHTML`) | Fully JSON-serializable — formatter functions replaced with pre-baked strings |

**Why two options?** `JSON.stringify` silently drops JavaScript functions. The live chart needs functions (dynamic hover state, display-name lookup). The HTML export needs a plain object with all values pre-computed as strings.

**Downstream highlight (BFS):**

```typescript
function getDownstream(start, links): Set<string>
```

On `mouseover` a node, BFS walks all outgoing links recursively and returns the reachable set. Non-reachable nodes are rendered at `opacity: 0.15`; non-reachable links at `opacity: 0.05`. ECharts' built-in `emphasis.focus` is disabled (`'none'`) to prevent conflicts.

**Dynamic height:**

```
dynamicHeight = max(400, nodes.length × heightPerNode)
```

`heightPerNode` (default 52) is exposed as a range slider in the chart toolbar. The same value is passed to `downloadHTML` so the exported file matches exactly.

---

### `exportHelpers.ts`

| Function | Mechanism |
|---|---|
| `downloadPNG(dataURL)` | Calls ECharts `getDataURL({ pixelRatio: 2 })`; triggers anchor click |
| `downloadHTML(option, height)` | Injects pre-serialized option + dynamic height into a self-contained HTML template with ECharts CDN |
| `downloadCSV(links)` | Serialises `Link[]` array to RFC-4180 CSV |
| `downloadJSON(state)` | Pretty-prints `{ links, nodeColors, nodeLabels }` |

All downloads use `URL.createObjectURL` + a programmatic anchor click; no server round-trip required.

---

## Design Decisions

### Scope-to-source

Problem: Multiple months sharing a node name like "Total Incidents" would merge into one shared node in ECharts.

Solution: Internal node key = `"Total Incidents [Oct]"`, display label = `"Total Incidents"`. The `nodeLabels` map acts as a translation layer. ECharts always receives internal keys in `data[].name` and link `source`/`target`; the label `formatter` looks up the display label before rendering.

### Series-level label formatter

ECharts evaluates `label.formatter` on every re-render. Putting the formatter at the **series level** (not per-node) ensures values always render even when a node has no custom label override. Per-node `label` objects only override colours (to support the dim/bright hover effect).

### Export serialization

The export option pre-bakes every formatter into a rich-text string literal:
```
"{name|Total Incidents}\n{value|74}"
```
This is a plain string (no `{` template tokens that ECharts would interpret as placeholders), so it survives `JSON.stringify` and renders identically in the exported HTML.

### State persistence

Zustand `persist` middleware writes to `localStorage` on every state change. No explicit save call is needed for session continuity. The **Save JSON** toolbar button provides a portable snapshot for sharing or backup — it stores only the three data fields (`links`, `nodeColors`, `nodeLabels`), not UI state.
