# Sankey Diagram Builder

An interactive, browser-based Sankey diagram builder. Paste data straight from Excel, build multi-level hierarchies, customise node colours, and export as PNG, interactive HTML, or CSV — all without a backend.

---

## Quick Start

```bash
cd sankey-react
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Features

| Feature | Details |
|---|---|
| **Paste from Excel** | Tab-separated or comma-separated; vertical (name + value per row) or horizontal (names row + values row) — auto-detected |
| **Three input modes** | Normal, Multi-branch (fan-out), Chain (auto-hierarchy A → B → C) |
| **Scope-to-source** | Keeps same-named nodes separate per source month/category (stored as `"Total Incidents [Oct]"`, displayed as `"Total Incidents"`) |
| **Live preview** | Preview table shows exact links that will be added before you confirm |
| **Downstream highlight** | Hover any node to dim everything outside its downstream path |
| **Node colours** | Per-node colour picker with auto-assigned palette; swatch strip for quick overview |
| **Manage connections** | Inline edit / delete every link; source & target use dropdown selectors |
| **Dynamic chart height** | Slider to set px-per-node so the diagram never crowds regardless of data size |
| **Save / Load state** | Full JSON snapshot (links + colours + labels) — share or restore sessions |
| **Export PNG** | High-resolution canvas capture (2× pixel ratio) |
| **Export HTML** | Standalone file with ECharts CDN — open anywhere, no server needed; display names and values correctly embedded |
| **Export CSV** | All links as a plain CSV file |
| **Auto-persist** | State saved to `localStorage` automatically — refreshing the page restores your diagram |

---

## How to Use

### Step 1 — Pick or create a source node

Type a new source name (e.g. `Oct`) or select an existing one from the dropdown in the left panel.

### Step 2 — Choose a paste mode

| Mode | Use when… |
|---|---|
| **Normal** | Each row is one `Source → Target, Value` connection |
| **Multi-branch** | Paste all child names on one row and all values on the next — all connect to the selected source at once |
| **Chain** | Paste a sequence of node names and values — automatically builds `Source → A → B → C` |

### Step 3 — Paste your data

Copy a range from Excel and paste into the text area. Example formats:

**Normal / Multi-branch (vertical)**
```
User Guidance Ticket    74
Other Incidents         148
```

**Normal / Multi-branch (horizontal)**
```
bypassed GS    data gap    formality question
20             5           2
```

**Chain**
```
Total Incidents    Total user Guidance    Total incidents with usecase
222                74                     28
```

### Step 4 — Scope-to-source toggle

Turn **ON** when you want same-named nodes to stay separate per source (e.g. building month-by-month flows where every month has a "Total Incidents" node). Turn **OFF** when you want shared nodes to merge (e.g. a single "Unresolved" bucket that multiple sources feed into).

### Step 5 — Add & repeat

Click **Add connections** / **Build hierarchy chain** / **Add all branches**. Switch to the next source and repeat.

---

## Export Notes

- **PNG** — exact screenshot of what you see in the browser at 2× resolution.
- **HTML** — fully standalone; display names (short labels) and numeric values are baked in. Chart height matches whatever you set with the slider.
- **JSON** — save with the toolbar button; load back later to continue editing.

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Apache ECharts** via `echarts-for-react`
- **Zustand** (state management + `localStorage` persistence)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **react-colorful** (colour picker)
