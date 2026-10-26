export const number = value => value == null ? '—' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })
export const money = value => value == null ? '—' : `₹${Math.round(value).toLocaleString('en-IN')}`
export const percent = value => value == null ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`
export const points = value => value == null ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(1)} pt`
export const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const routeLabel = value => value?.replace('-', ' → ') || '—'

export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function indexChartSvg(report, comparison) {
  const values = report.series.map(item => Number(item.index))
  const low = Math.floor(Math.min(100, ...values) - 3)
  const high = Math.ceil(Math.max(100, ...values) + 3)
  const x = index => 72 + index * 960 / Math.max(values.length - 1, 1)
  const y = value => 350 - (value - low) * 270 / Math.max(high - low, 1)
  const line = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  const compared = report.series.findIndex(item => item.date === comparison?.compareTo)
  const marker = compared < 0 ? '' : `<circle cx="${x(compared)}" cy="${y(values[compared])}" r="6" fill="#b75336" stroke="#fff" stroke-width="3"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="440" viewBox="0 0 1100 440" role="img" aria-label="SkyMetrics simulated airfare research index"><rect width="1100" height="440" fill="#ffffff"/><text x="72" y="45" fill="#19353c" font-family="Arial" font-size="24" font-weight="bold">SkyMetrics airfare research index</text><text x="72" y="67" fill="#60736e" font-family="Arial" font-size="12">Simulated fares · exact 21-day booking horizon · base ${report.baseDate} = 100</text><line x1="72" y1="${y(100)}" x2="1032" y2="${y(100)}" stroke="#bdc9c2" stroke-dasharray="5 5"/><text x="28" y="${y(100) + 4}" fill="#60736e" font-family="Arial" font-size="12">100</text><polyline points="${line}" fill="none" stroke="#b75336" stroke-width="3" stroke-linejoin="round"/>${marker}<text x="72" y="385" fill="#60736e" font-family="Arial" font-size="12">${report.baseDate}</text><text x="955" y="385" fill="#60736e" font-family="Arial" font-size="12">${report.asOf}</text><text x="72" y="418" fill="#60736e" font-family="Arial" font-size="11">Research prototype · ${report.datasetId} · not official CPI or measured airfare inflation</text></svg>`
}
