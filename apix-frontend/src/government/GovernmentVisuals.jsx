import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money, number, points, routeLabel } from './format'

export function ContributionChart({ drivers = [], onChooseRoute }) {
  const rows = drivers.slice(0, 8).map(item => ({ ...item, label: routeLabel(item.route), value: Number(item.contributionPoints) }))
  if (!rows.length) return <p className="govw-note">No comparable route contributions for these dates.</p>
  return <div className="govw-visual"><div className="govw-visual-heading"><div><span className="govw-kicker">INDEX DRIVERS</span><h3>Which routes explain the change?</h3></div><small>Contribution in index points</small></div><div className="govw-bar-chart" role="img" aria-label="Horizontal bar chart of route contributions to the national index"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 22, bottom: 4, left: 4 }}><CartesianGrid stroke="#e5e7e1" horizontal={false}/><XAxis type="number" tick={{ fontSize: 11, fill: '#5d6d68' }}/><YAxis type="category" dataKey="label" width={98} tick={{ fontSize: 12, fill: '#20383a' }}/><Tooltip formatter={value => [points(value), 'Contribution']}/><Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>{rows.map(item => <Cell key={item.route} fill={item.value < 0 ? '#428277' : '#bd6245'}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="govw-visual-links">{rows.slice(0, 4).map(item => <button key={item.route} type="button" onClick={() => onChooseRoute(item.route)}>{item.label} <strong>{points(item.value)}</strong></button>)}</div><p className="govw-note">These are contributions, not route fares. Assumed flight volume affects each route’s weight.</p></div>
}

export function RouteRanking({ routes, selectedRoute, onRoute }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('monthly')
  const rows = useMemo(() => routes.filter(item => item.route.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => Math.abs(Number(b[sort === 'monthly' ? 'monthlyChangePercent' : 'changePercent'])) - Math.abs(Number(a[sort === 'monthly' ? 'monthlyChangePercent' : 'changePercent']))), [routes, search, sort])
  const max = Math.max(...rows.map(item => Math.abs(Number(item[sort === 'monthly' ? 'monthlyChangePercent' : 'changePercent']))), 1)
  return <section className="govw-visual govw-ranking"><div className="govw-visual-heading"><div><span className="govw-kicker">ALL DIRECTIONAL ROUTES</span><h3>Find the routes moving most</h3></div><div className="govw-ranking-controls"><label>Period<select value={sort} onChange={event => setSort(event.target.value)}><option value="monthly">30 days</option><option value="base">Since base</option></select></label><label>Find route<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="DEL-PAT"/></label></div></div><div className="govw-ranking-list">{rows.map((item, index) => { const value = Number(item[sort === 'monthly' ? 'monthlyChangePercent' : 'changePercent']); return <button key={item.route} type="button" className={item.route === selectedRoute ? 'selected' : ''} onClick={() => onRoute(item.route)} aria-pressed={item.route === selectedRoute}><span className="govw-rank">{String(index + 1).padStart(2, '0')}</span><strong>{routeLabel(item.route)}</strong><span className="govw-ranking-track"><i className={value < 0 ? 'negative' : ''} style={{ width: `${Math.max(3, 100 * Math.abs(value) / max)}%` }}/></span><b className={value < 0 ? 'negative' : ''}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</b></button> })}{!rows.length && <p className="govw-note">No route matches that search.</p>}</div><p className="govw-note">Ranked by size of movement, whether up or down. Select a route to inspect its full history below.</p></section>
}

export function LeadTimeChart({ lead }) {
  const values = lead.filter(item => item.median != null).map(item => Number(item.median))
  const low = Math.min(...values)
  const high = Math.max(...values)
  return <div className="govw-lead-visual" role="img" aria-label="Bar chart comparing median simulated fares at different booking lead times">{lead.map(item => { const value = Number(item.median); const height = Number.isFinite(value) && high > low ? 32 + 68 * (value - low) / (high - low) : 66; return <div key={item.daysBeforeDeparture} className="govw-lead-column"><strong>{money(item.median)}</strong><div className="govw-lead-bar-wrap"><i style={{ height: `${height}%` }}/></div><span>{item.daysBeforeDeparture} {item.daysBeforeDeparture === 1 ? 'day' : 'days'} before</span><small>{number(item.matchedDepartures)} departures</small></div> })}</div>
}

export function AirlineTimeMatrix({ cells, airlineNames }) {
  const times = ['morning', 'afternoon', 'evening', 'night']
  const names = [...new Set(cells.map(item => item.airline))]
  const fares = cells.map(item => Number(item.median)).filter(Number.isFinite)
  const min = Math.min(...fares), max = Math.max(...fares)
  return <div className="govw-matrix-scroll"><div className="govw-matrix"><span className="govw-matrix-corner">Carrier</span>{times.map(time => <b key={time} className="govw-matrix-head">{time}</b>)}{names.map(name => <div className="govw-matrix-row" key={name}><strong>{airlineNames[name] || name}</strong>{times.map(time => { const item = cells.find(cell => cell.airline === name && cell.timeBand?.toLowerCase() === time); const value = Number(item?.median); const strength = item && max > min ? (value - min) / (max - min) : 0.5; return <span key={time} className={item ? 'govw-matrix-cell' : 'govw-matrix-empty'} style={item ? { backgroundColor: `rgba(188, 98, 69, ${0.09 + strength * 0.22})` } : undefined} title={item ? `${number(item.observations)} simulated quotes` : 'No simulated fare observations for this airline and time period'}>{item ? <><b>{money(item.median)}</b><small>{number(item.observations)} quotes</small></> : <small>No data</small>}</span> })}</div>)}</div></div>
}

export function OutcomeChart({ quality }) {
  const total = Number(quality.attempted || 0)
  const groups = [{ label: 'Fare returned', value: Number(quality.available || 0), className: 'available' }, { label: 'No fare offered', value: Number(quality.unavailable || 0), className: 'unavailable' }, { label: 'Collection failed', value: Number(quality.collectionFailures || 0), className: 'failure' }]
  return <div className="govw-outcome-visual"><div className="govw-outcome-bar" role="img" aria-label="Stacked bar showing available fares, unavailable fares, and collection failures">{groups.map(item => <i key={item.label} className={item.className} style={{ width: `${total ? 100 * item.value / total : 0}%` }} title={`${item.label}: ${number(item.value)}`}/>)}</div><div className="govw-outcome-legend">{groups.map(item => <div key={item.label}><i className={item.className}/><span>{item.label}</span><strong>{number(item.value)}</strong><small>{total ? number(100 * item.value / total) : 0}%</small></div>)}</div></div>
}

export function QualityHistoryChart({ series }) {
  const rows = series.map(item => ({ date: item.date, returned: item.attempted ? Math.round(1000 * item.available / item.attempted) / 10 : null, failed: item.attempted ? Math.round(1000 * item.collectionFailures / item.attempted) / 10 : null }))
  return <div className="govw-quality-history" role="img" aria-label="Line chart showing fare return and collection failure rates across recent collection days"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e5e7e1"/><XAxis dataKey="date" tickFormatter={value => value.slice(5)} minTickGap={22} tick={{ fontSize: 10, fill: '#61716d' }}/><YAxis domain={[0, 100]} tickFormatter={value => `${value}%`} width={46} tick={{ fontSize: 10, fill: '#61716d' }}/><Tooltip formatter={(value, name) => [`${number(value)}%`, name === 'returned' ? 'Fare returned' : 'Collection failed']}/><Line dataKey="returned" type="monotone" stroke="#4f8d80" strokeWidth={2.5} dot={false} isAnimationActive={false}/><Line dataKey="failed" type="monotone" stroke="#bd6245" strokeWidth={2} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
}
