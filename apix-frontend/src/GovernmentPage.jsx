import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Database, Download, FileWarning, Landmark, Plane, RefreshCw, Bookmark } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, DATASET_ID } from './api'
import './government.css'
import './government-polish.css'

const day = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'
const fullDay = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const signed = value => value == null ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`
const cityNames = { DEL:'Delhi', BOM:'Mumbai', BLR:'Bengaluru', CCU:'Kolkata', HYD:'Hyderabad', PNQ:'Pune', AMD:'Ahmedabad', MAA:'Chennai', PAT:'Patna', GOI:'Goa' }
const percentField = { daily: 'dailyChangePercent', weekly: 'weeklyChangePercent', monthly: 'changePercent' }
const savedView = (() => { try { return JSON.parse(localStorage.getItem('skymetrics-government-view') || '{}') } catch { return {} } })()

function download(name, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Movement({ title, value, note }) {
  const down = value < 0
  return <div className="gov-movement"><span>{title}</span><strong className={value == null ? '' : down ? 'fall' : 'rise'}>{value == null ? null : down ? <ArrowDownRight size={19}/> : <ArrowUpRight size={19}/>} {signed(value)}</strong><small>{note}</small></div>
}

export default function GovernmentPage() {
  const [report, setReport] = useState(null)
  const [window, setWindow] = useState(null)
  const [provenance, setProvenance] = useState(null)
  const [asOf, setAsOf] = useState(savedView.asOf || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [sort, setSort] = useState(savedView.sort || 'rise')
  const [period, setPeriod] = useState(savedView.period || 'monthly')
  const [view, setView] = useState(savedView.view || 'overview')
  const [routeFilter, setRouteFilter] = useState(savedView.routeFilter || '')
  const [selectedRoute, setSelectedRoute] = useState(savedView.selectedRoute || '')
  const [booking, setBooking] = useState(null)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const [compareDate, setCompareDate] = useState(savedView.compareDate || '')
  const [savedNotice, setSavedNotice] = useState('')
  useEffect(() => {
    let live = true
    setBusy(true)
    setError('')
    api.governmentIndex(asOf || undefined).then(result => {
      if (!live) return
      setReport(result.data)
      setWindow(result.observationWindow || null)
      setProvenance({modelVersion:result.modelVersion,configHash:result.configHash})
      setAsOf(result.asOf || '')
      setCompareDate(current => current && current <= result.asOf ? current : result.data?.baseDate || '')
      setSelectedRoute(current => current || result.data?.routes?.[0]?.route || '')
      setBusy(false)
    }).catch(cause => {
      if (live) { setError(cause.message || 'Policy index could not be loaded. Check that the backend is running.'); setBusy(false) }
    })
    return () => { live = false }
  }, [requestVersion])
  useEffect(() => {
    if (view !== 'lead' || !selectedRoute || !asOf) return
    let live = true
    setBooking(null)
    setBookingError('')
    setBookingBusy(true)
    api.booking(selectedRoute, asOf).then(result => {
      if (live) { setBooking(result.data); setBookingBusy(false) }
    }).catch(cause => {
      if (live) { setBookingError(cause.message || 'Booking-window data is unavailable.'); setBookingBusy(false) }
    })
    return () => { live = false }
  }, [view, selectedRoute, asOf, requestVersion])
  const retry = () => setRequestVersion(value => value + 1)
  const routes = [...(report?.routes || [])]
    .filter(item => item.route.toLowerCase().includes(routeFilter.toLowerCase()))
    .sort((a,b) => sort === 'rise' ? (b[percentField[period]] ?? -Infinity)-(a[percentField[period]] ?? -Infinity) : (a[percentField[period]] ?? Infinity)-(b[percentField[period]] ?? Infinity))
  const comparison = report?.series?.find(item => item.date === compareDate)
  const indexPointChange = comparison && report?.index != null ? Number(report.index) - Number(comparison.index) : null
  const drivers = (report?.routes || []).map(route => {
    const earlier = report.routeSeries?.find(item => item.date === compareDate && item.route === route.route)
    return {...route, driverPoints: earlier ? Number(((Number(route.index) - Number(earlier.index)) * Number(route.weightPercent) / 100).toFixed(2)) : null}
  }).sort((a,b) => Math.abs(b.driverPoints || 0) - Math.abs(a.driverPoints || 0))
  const qualityReview = report?.coverage?.qualityFlag === 'REVIEW_COVERAGE'
  const exportIndex = () => {
    const header = 'date,index,available_observations,data_mode,base_date,weight_source,model_version\n'
    const rows = (report.series || []).map(item => [item.date,item.index,item.availableObservations,'SIMULATED',report.baseDate,'synthetic_scheduled_service_count',provenance?.modelVersion || ''].join(','))
    download(`skymetrics-airfare-index-${asOf}.csv`, 'text/csv;charset=utf-8', header + rows.join('\n') + '\n')
  }
  const exportJson = () => download(`skymetrics-policy-report-${asOf}.json`, 'application/json', JSON.stringify({dataMode:'SIMULATED',datasetId:DATASET_ID,asOf,observationWindow:window,...provenance,data:report}, null, 2))
  const exportRoutes = () => {
    const header = 'route,index,period,change_percent,contribution_index_points,weight_percent,matched_groups,data_mode,base_date,as_of\n'
    const rows = routes.map(item => [item.route,item.index,period,item[percentField[period]],item.contributionPoints,item.weightPercent,item.matchedCells,'SIMULATED',report.baseDate,asOf].join(','))
    download(`skymetrics-routes-${asOf}.csv`,'text/csv;charset=utf-8',header+rows.join('\n')+'\n')
  }
  const exportChart = () => {
    const points = report?.series || []
    if (!points.length) return
    const values = points.map(item => Number(item.index))
    const min = Math.min(...values)-2, max = Math.max(...values)+2
    const line = points.map((item,index) => `${48 + 704*index/Math.max(1,points.length-1)},${242-175*(Number(item.index)-min)/(max-min)}`).join(' ')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300"><rect width="800" height="300" fill="#f7f6f1"/><text x="48" y="35" font-family="Arial" font-size="20" font-weight="bold" fill="#203438">SkyMetrics · simulated airfare index</text><text x="48" y="55" font-family="Arial" font-size="11" fill="#61736c">18–24-day booking window · fixed base ${report.baseDate} = 100 · not official CPI</text><line x1="48" y1="242" x2="752" y2="242" stroke="#a6b7ac"/><polyline points="${line}" fill="none" stroke="#c65d3b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><text x="48" y="275" font-family="Arial" font-size="11" fill="#61736c">${report.baseDate}</text><text x="685" y="275" font-family="Arial" font-size="11" fill="#61736c">${window?.lastCollectionDate || asOf}</text></svg>`
    download(`skymetrics-index-chart-${asOf}.svg`,'image/svg+xml;charset=utf-8',svg)
  }
  const saveView = () => {
    try { localStorage.setItem('skymetrics-government-view',JSON.stringify({asOf,compareDate,view,period,sort,routeFilter,selectedRoute})); setSavedNotice('View saved in this browser.') }
    catch { setSavedNotice('This browser could not save the view.') }
    setTimeout(()=>setSavedNotice(''),2800)
  }
  return <div className="gov-page">
    <div className="gov-toolbar"><span className="gov-data-label"><i/> SIMULATED DATASET · POLICY ANALYSIS</span><div className="gov-toolbar-actions"><label className="gov-date-picker"><CalendarDays size={16}/> As of <input type="date" aria-label="Index date" value={asOf} min={window?.firstIndexDate} max={window?.lastCollectionDate} onChange={event => { setAsOf(event.target.value); setRequestVersion(value => value + 1) }}/></label><button onClick={retry} disabled={busy}><RefreshCw className={busy?'gov-spin':''} size={16}/> Refresh</button><button onClick={exportIndex} disabled={!report?.series || busy}><Download size={16}/> Index CSV</button><button onClick={exportChart} disabled={!report?.series || busy}><Download size={16}/> Chart SVG</button><button onClick={exportJson} disabled={!report?.series || busy}><Download size={16}/> JSON</button></div></div>
    <motion.section className="gov-hero" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <div><span className="gov-kicker"><Landmark size={15}/> NATIONAL AIRFARE OBSERVATORY</span><h2>Simulated airfare index</h2><p>Comparable fares around a 21-day booking target, tracked against one fixed base.</p><div className="gov-badges"><span>RESEARCH PROTOTYPE</span><span>As of {fullDay(asOf)}</span><span>Fixed base: {fullDay(report?.baseDate)} = 100</span></div></div>
      <div className="gov-hero-side"><span>INDEX LEVEL</span><strong>{report?.index == null ? '—' : Number(report.index).toFixed(1)}</strong><small>18–24 days before departure · base 100</small></div>
    </motion.section>
    <div className="gov-notice"><FileWarning size={17}/><p><strong>For demonstration only.</strong> This uses simulated observations and a service-count proxy for route weights. It is not official CPI or measured airfare inflation.</p></div>
    {busy && <div className="gov-state"><RefreshCw className="gov-spin" size={24}/><strong>Calculating the matched fare basket…</strong><span>Comparing 18–24-day advance quotes across the same route, airline and flight-time groups.</span></div>}
    {!busy && error && <div className="gov-state"><FileWarning size={24}/><strong>{error}</strong><button onClick={retry}>Retry</button></div>}
    {!busy && !error && report?.status === 'INSUFFICIENT_DATA' && <div className="gov-state"><Database size={24}/><strong>More comparable collection dates are needed.</strong><span>{report.reason}</span></div>}
    {!busy && !error && report?.status === 'PROTOTYPE_ONLY' && <>
      <nav className="gov-tabs" aria-label="Policy analysis views">{[['overview','Overview'],['routes','Routes and cities'],['lead','Booking lead time'],['method','Methodology']].map(([key,label])=><button key={key} className={view===key?'selected':''} onClick={()=>setView(key)}>{label}</button>)}</nav>
      <div className="gov-analyst-tools"><label>Compare with <input type="date" aria-label="Comparison date" value={compareDate} min={report.baseDate} max={asOf} onChange={event=>setCompareDate(event.target.value)}/></label><button onClick={saveView}><Bookmark size={15}/> Save this view</button><span role="status">{savedNotice || `Comparable window: ${fullDay(report.baseDate)} – ${fullDay(window?.lastCollectionDate)}`}</span></div>
      {view==='overview' && <>
      <section className="gov-brief"><div><span>ANALYST BRIEF · {fullDay(asOf)}</span><h3>{indexPointChange == null ? 'Choose a comparison date' : `${indexPointChange >= 0 ? '+' : ''}${indexPointChange.toFixed(1)} index points since ${fullDay(compareDate)}`}</h3><p>{drivers[0]?.driverPoints != null ? `${drivers[0].route.replace('-', ' → ')} is the largest route-level driver in this comparison (${drivers[0].driverPoints >= 0 ? '+' : ''}${drivers[0].driverPoints.toFixed(2)} index points).` : 'Route contributions are unavailable for this comparison.'} The result describes generated fares, not observed market inflation.</p></div><div className={qualityReview?'gov-quality review':'gov-quality'}><strong>{qualityReview?'Review coverage':'Comparable sample'}</strong><span>{report.coverage?.fixedMatchedCells} matched groups · {report.coverage?.coveredRoutes}/{report.coverage?.basketRoutes} routes</span><small>{report.coverage?.excludedBaseCells} base groups excluded; {report.coverage?.excludedRoutes?.length || 0} routes without full coverage.</small></div></section>
      <div className="gov-movements"><Movement title="Since yesterday" value={report.movements?.daily} note="1-day basket change"/><Movement title="Past week" value={report.movements?.weekly} note="7-day basket change"/><Movement title="Past month" value={report.movements?.monthly} note="Change from the base date"/></div>
      <section className="gov-panel gov-drivers"><div className="gov-title"><div><span><BarChart3 size={15}/> DECOMPOSITION</span><h3>What moved the index?</h3></div><small>Index-point contributions since {day(compareDate)}</small></div><div className="gov-driver-list">{drivers.slice(0,6).map(item=><div key={item.route}><strong>{item.route.replace('-', ' → ')}</strong><div className="gov-driver-track"><i className={item.driverPoints < 0?'negative':''} style={{width:`${Math.min(100,Math.abs(item.driverPoints || 0)*28)}%`}}/></div><b>{item.driverPoints == null?'—':`${item.driverPoints > 0 ? '+' : ''}${item.driverPoints.toFixed(2)} pt`}</b><small>{item.weightPercent}% weight · {item.matchedCells} groups</small></div>)}</div><p className="gov-caption">Contributions use the same synthetic service-count weights as the headline index. Their sum is the change in index points, subject to rounding.</p></section>
      <div className="gov-grid"><section className="gov-panel gov-chart"><div className="gov-title"><div><span><Activity size={15}/> NATIONAL BASKET</span><h3>How the index moved</h3></div><small>Base = 100 on {day(report.baseDate)}</small></div><div className="gov-chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.series}><defs><linearGradient id="govArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2c6dc7" stopOpacity=".4"/><stop offset="1" stopColor="#2c6dc7" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#e2e8ee" vertical={false}/><XAxis dataKey="date" tickFormatter={day} axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:11}}/><YAxis domain={['dataMin - 1','dataMax + 1']} axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:11}} width={40}/><Tooltip formatter={value=>[Number(value).toFixed(1),'Index']} labelFormatter={day} contentStyle={{background:'#0c1c2c',border:'1px solid #ffffff2b',borderRadius:9}}/><Area type="monotone" dataKey="index" stroke="#2c6dc7" strokeWidth={3} fill="url(#govArea)" dot={{r:3,fill:'#d2f56f',strokeWidth:0}} animationDuration={750}/></AreaChart></ResponsiveContainer></div><p className="gov-caption">The same route, airline and departure-time groups are tracked throughout this window. The exact mix of booking lead times within 18–24 days may vary.</p></section>
      <section className="gov-panel"><div className="gov-title"><div><span><Database size={15}/> DATA COVERAGE</span><h3>What this view includes</h3></div></div><div className="gov-coverage"><div><strong>{report.coverage?.coveredRoutes} / {report.coverage?.basketRoutes}</strong><span>routes covered</span></div><div><strong>{report.coverage?.fixedMatchedCells}</strong><span>matched fare groups</span></div><div><strong>{Number(report.coverage?.cellRetentionPercent || 0).toFixed(0)}%</strong><span>base groups retained</span></div><div><strong>{Number(report.coverage?.availableObservationsToday || 0).toLocaleString('en-IN')}</strong><span>18–24-day quotes on selected date</span></div></div><p className="gov-caption">{report.coverage?.sampledDates || report.series?.length} collection dates · {report.coverage?.excludedBaseCells} base groups excluded · {report.coverage?.excludedRoutes?.length || 0} routes missing full coverage. A group matches route, airline and departure-time band, with fares quoted 18–24 days before departure.</p></section></div>
      </>}
      {view==='routes' && <><div className="gov-route-controls"><div className="gov-toggle">{[['daily','1 day'],['weekly','7 days'],['monthly','Since base']].map(([key,label])=><button key={key} className={period===key?'selected':''} onClick={()=>setPeriod(key)}>{label}</button>)}</div><input type="search" aria-label="Filter routes" placeholder="Search route code" value={routeFilter} onChange={event=>setRouteFilter(event.target.value)}/><button className="gov-route-export" onClick={exportRoutes}><Download size={15}/> Export displayed routes</button></div>
      <section className="gov-heat-section"><div><span>ROUTE HEATMAP</span><h3>Fare movement at a glance</h3><p>Colour represents change in the selected period; select a route for its booking curve.</p></div><div className="gov-heat-grid">{routes.map(item=>{const change=item[percentField[period]];return <button key={item.route} className={change==null?'neutral':change<0?'down':'up'} onClick={()=>{setSelectedRoute(item.route);setView('lead')}}><strong>{item.route.replace('-', ' → ')}</strong><span>{signed(change)}</span></button>})}</div><div className="gov-heat-key"><span><i className="down"/>Lower</span><span><i className="neutral"/>Stable / unavailable</span><span><i className="up"/>Higher</span></div></section>
      <div className="gov-grid"><section className="gov-panel"><div className="gov-title"><div><span><BarChart3 size={15}/> ROUTE COMPARISON</span><h3>Where fares moved most</h3></div><div className="gov-toggle"><button className={sort==='rise'?'selected':''} onClick={()=>setSort('rise')}>Rising</button><button className={sort==='fall'?'selected':''} onClick={()=>setSort('fall')}>Falling</button></div></div><div className="gov-route-list">{routes.map(item => { const change=item[percentField[period]]; return <button key={item.route} onClick={()=>{setSelectedRoute(item.route);setView('lead')}} title={`Inspect booking lead time for ${item.route}`}><strong>{item.route.replace('-', ' → ')}</strong><div className="gov-bar"><i style={{width:`${Math.min(100,Math.abs(change || 0)*3)}%`,background:change<0?'#56876a':'#c65d3b'}}/></div><span className={change<0?'fall':'rise'}>{signed(change)}</span></button> })}</div>{routes.length===0 && <p className="gov-caption">No route matches that search.</p>}<p className="gov-caption">Route changes use the same matched fare groups at both dates. Select a route to inspect its booking pattern.</p></section>
      <section className="gov-panel"><div className="gov-title"><div><span><Plane size={15}/> CITY DEPARTURES</span><h3>City-level movement</h3></div></div><div className="gov-city-list">{report.cities?.map(item => <div key={item.city}><span><strong>{cityNames[item.city] || item.city}</strong><small>{item.coveredRoutes} routes</small></span><b className={item.changePercent<0?'fall':'rise'}>{signed(item.changePercent)}</b></div>)}</div></section></div>
      </>}
      {view==='lead' && <div className="gov-lead-layout"><section className="gov-panel"><div className="gov-title"><div><span><CalendarDays size={15}/> ADVANCE PURCHASE</span><h3>Booking lead-time pattern</h3></div></div><p className="gov-caption">Historical medians for completed simulated departures. This is descriptive analysis, not a fare forecast.</p><label className="gov-lead-selector">Select route <select value={selectedRoute} onChange={event=>setSelectedRoute(event.target.value)}>{report.routes?.map(item=><option key={item.route} value={item.route}>{item.route.replace('-', ' → ')}</option>)}</select></label>{bookingBusy && <div className="gov-lead-state"><RefreshCw className="gov-spin" size={20}/> Calculating booking pattern…</div>}{bookingError && <div className="gov-lead-state"><FileWarning size={20}/> {bookingError}</div>}{!bookingBusy && booking?.status==='INSUFFICIENT_DATA' && <div className="gov-lead-state">{booking.reason || 'Not enough completed departures to compare booking windows.'}</div>}{!bookingBusy && booking?.curve && <><div className="gov-lead-highlight"><span>LOWEST OBSERVED MEDIAN</span><strong>{booking.lowestMedianHorizon == null?'Unavailable':`${booking.lowestMedianHorizon} days before departure`}</strong><small>{booking.completedDepartureCohort} completed flight departures compared</small></div><div className="gov-lead-list">{booking.curve.filter((_,index)=>index%3===0 || index===booking.curve.length-1).map(point=><div key={point.daysBeforeDeparture}><span>{point.daysBeforeDeparture} days</span><div><i style={{width:`${Math.max(3,Math.min(100,100*Number(point.median || 0)/Math.max(...booking.curve.map(row=>Number(row.median)||0),1)))}%`}}/></div><strong>{point.median==null?'—':`₹${Number(point.median).toLocaleString('en-IN')}`}</strong></div>)}</div><p className="gov-caption">Unavailable offers are excluded. The lowest historical median does not guarantee a future fare.</p></>}</section><aside className="gov-panel"><div className="gov-title"><div><span><Activity size={15}/> INTERPRETATION</span><h3>What the curve means</h3></div></div><p className="gov-caption">Each point compares fares recorded that many days before departure on the selected directional route. The backend uses completed departures with all 45 booking-horizon observations, so the comparison follows the same flights over time.</p><p className="gov-caption">This pattern comes from generated fare data. It does not tell an analyst what real airlines currently charge.</p></aside></div>}
      {view==='method' && <section className="gov-method"><span>HOW TO READ THIS INDEX</span><h3>Transparent methodology</h3><div><p><strong>Standard quote.</strong> Each price is the median for a route, airline and departure-time band quoted 18–24 days before departure, around a 21-day target. The same groups must appear on all {report.coverage?.sampledDates} collection dates.</p><p><strong>One fixed base.</strong> The basket starts at 100 on {fullDay(report.baseDate)} and stays fixed when you select another date within this published window. The comparison date changes the briefing, not the base.</p><p><strong>Coverage rule.</strong> {report.coverage?.excludedBaseCells} base groups and {report.coverage?.excludedRoutes?.length || 0} routes are excluded for incomplete coverage. Missing or unavailable offers are not invented.</p><p><strong>Weight limitation.</strong> Routes use a synthetic scheduled-service-count proxy. Passenger and spending weights are unavailable. Travel weekday, exact booking horizon and fare-product quality are not yet fixed. This is not an official CPI estimate.</p></div><div className="gov-method-facts"><span>Comparable window: {fullDay(report.baseDate)} – {fullDay(window?.lastCollectionDate)}</span><span>Advance purchase target: 21 days (18–24)</span><span>Model: {provenance?.modelVersion || '—'}</span><span>Config: {provenance?.configHash?.slice(0,12) || '—'}</span><span>API: /api/v1/indices/airfare/government</span><span>Data mode: SIMULATED</span></div><small>Year-on-year movement is omitted because a comparable prior-year basket is unavailable.</small></section>}
    </>}
  </div>
}
