export function downloadJSON(data: object, filename = 'sankey_state.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export function downloadCSV(rows: object[], filename = 'sankey_data.csv') {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => (r as Record<string,unknown>)[h]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  triggerDownload(blob, filename)
}

export function downloadPNG(dataURL: string, filename = 'sankey_diagram.png') {
  const a = document.createElement('a')
  a.href = dataURL
  a.download = filename
  a.click()
}

export function downloadHTML(chartOption: object, chartHeight: number, filename = 'sankey_diagram.html') {
  const optJson = JSON.stringify(chartOption, null, 2)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sankey Diagram</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"><\/script>
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; font-family: Inter, sans-serif; }
    body { padding: 48px 64px; box-sizing: border-box; }
    #chart { max-width: 1600px; height: ${chartHeight}px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    const chart = echarts.init(document.getElementById('chart'));
    chart.setOption(${optJson});
    window.addEventListener('resize', () => chart.resize());
  <\/script>
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
