import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowDownRight, ArrowRight, ArrowLeftRight, ArrowUpRight, Bell, Bookmark, CalendarDays, CheckCircle2, ChevronDown, Clock3, Heart, Link2, Map, Plane, Route, Sparkles, TrendingUp, TriangleAlert, X } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, AS_OF, DATASET_ID } from './api'
import './consumer-refinement.css'
import { authApi } from './authApi'
import { useAuth } from './AuthContext'
import SiteNav from './SiteNav'
import LoadingScreen from './LoadingScreen'
import { useNavigate, useSearchParams } from 'react-router'
import indiaStates from './india-states.svg'
import './product.css'
import './site.css'
import './final.css'

const money = value => value == null ? '—' : `₹${Math.round(value).toLocaleString('en-IN')}`
const pct = value => value == null ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`
const shortDay = date => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Choose a date'
const flightTime = value => value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'Time unavailable'
const cityNames = { DEL:'Delhi', BOM:'Mumbai', BLR:'Bengaluru', CCU:'Kolkata', HYD:'Hyderabad', PNQ:'Pune', AMD:'Ahmedabad', MAA:'Chennai', PAT:'Patna', GOI:'Goa' }
const airlineNames = { '6E':'IndiGo', AI:'Air India', QP:'Akasa Air', SG:'SpiceJet', IX:'Air India Express', UK:'Vistara' }
const mapPoints = { DEL:[139.2,147.5], BOM:[88.4,261.1], BLR:[146.5,331.8], CCU:[275.4,218.3], HYD:[155.1,283.3], PNQ:[101,267.2], AMD:[85.5,213.3], MAA:[176,334.3], PAT:[235.1,183.1], GOI:[100,305.6] }
const mapLabels = { DEL:'Delhi', BOM:'Mumbai', BLR:'Bengaluru', CCU:'Kolkata', HYD:'Hyderabad', PNQ:'Pune', AMD:'Ahmedabad', MAA:'Chennai', PAT:'Patna', GOI:'Goa' }
const mapLabelPositions = { BOM:[-8,-6,'end'], GOI:[-8,-6,'end'], AMD:[-8,-6,'end'], BLR:[-7,-7,'end'], PNQ:[7,13,'start'], MAA:[8,11,'start'] }
const slide = { hidden:{ opacity:0, y:14 }, show:{ opacity:1, y:0 } }
const responseCache = new globalThis.Map()
function cached(key, call) {
  key = `${DATASET_ID}:${AS_OF}:${key}`
  if (!responseCache.has(key)) responseCache.set(key, call().catch(error => { responseCache.delete(key); throw error }))
  return responseCache.get(key)
}

function Logo() {
  return <div className="brand"><div className="logo-mark"><Plane size={20}/></div><strong>Sky<span>Metrics</span><b className="brand-full">Airfare Intelligence</b></strong></div>
}

function IndiaRouteMap({ route, date, loading, routes }) {
  const [from,to] = route.split('-'), start=mapPoints[from]||[180,100], end=mapPoints[to]||[250,250]
  const control=[(start[0]+end[0])/2,(start[1]+end[1])/2-Math.max(32,Math.abs(end[0]-start[0])*.22)]
  const path=`M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}`
  const backgroundRoutes = [...new Set(routes.map(item => item.code.split('-').sort().join('-')))].filter(code => code !== [from,to].sort().join('-')).slice(0,16)
  return <motion.div className="route-map" key={route} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
    <div className="route-map-copy"><span className="eyebrow"><Map size={13}/> SELECTED JOURNEY</span><h3>{cityNames[from]} <b>to</b> {cityNames[to]}</h3><p>{date ? `${shortDay(date)} ${date.slice(0,4)} · One-way fare analysis` : 'Choose an available travel date'}</p><div className="route-map-legend"><span><i className="origin-dot"/>{from}</span><span><i className="destination-dot"/>{to}</span></div><div className={`auto-analysis ${loading ? 'working' : ''}`}><i/>{!date ? 'Choose a date to analyse' : loading ? 'Analysing this fare…' : 'Compare flights and nearby dates below'}</div></div>
    <div className="india-map-wrap" aria-label={`Map showing flight path from ${cityNames[from]} to ${cityNames[to]}`}>
      <svg viewBox="0 0 420 470" role="img">
        <defs><linearGradient id="indiaFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#354744"/><stop offset="1" stopColor="#243338"/></linearGradient><filter id="routeGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <text className="map-heading" x="20" y="29">DOMESTIC ROUTES ACROSS INDIA</text><text className="map-subheading" x="20" y="46">Covered airports · selected flight path</text>
        <image className="india-geo" href={indiaStates} x="0" y="0" width="420" height="470"/>
        <g className="map-background-routes">{backgroundRoutes.map(code => { const [a,b]=code.split('-'), p=mapPoints[a], q=mapPoints[b]; if(!p||!q)return null; const middleX=(p[0]+q[0])/2, middleY=(p[1]+q[1])/2-Math.max(25,Math.abs(q[0]-p[0])*.18); return <path key={code} d={`M ${p[0]} ${p[1]} Q ${middleX} ${middleY} ${q[0]} ${q[1]}`}/> })}</g>
        <g className="map-all-nodes">{Object.entries(mapPoints).map(([code,point]) => { const [dx,dy,anchor]=mapLabelPositions[code]||[7,-6,'start'];return <g key={code}><circle cx={point[0]} cy={point[1]} r="2.7"/>{code!==from&&code!==to&&<text x={point[0]+dx} y={point[1]+dy} textAnchor={anchor}>{mapLabels[code]}</text>}</g> })}</g>
        <path className="flight-path-shadow" d={path}/><motion.path className="flight-path" d={path} initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:.8,ease:'easeOut'}}/>
        <motion.g className="map-plane" initial={{offsetDistance:'0%'}} animate={{offsetDistance:'100%'}} transition={{duration:1.5,ease:'easeInOut'}} style={{offsetPath:`path('${path}')`}}><circle r="13"/><path d="M-7 1 L8-5 3 2 8 6 5 8 0 4-4 8-6 7-3 2Z"/></motion.g>
        <g className="map-marker origin" transform={`translate(${start[0]} ${start[1]})`}><circle className="marker-ring" r="13"/><circle r="6"/><text x="16" y="5">{from}</text></g>
        <g className="map-marker destination" transform={`translate(${end[0]} ${end[1]})`}><circle className="marker-ring" r="13"/><circle r="6"/><text x="16" y="5">{to}</text></g>
        <text className="map-caption" x="20" y="448">{from} → {to}  ·  {date ? shortDay(date) : 'Select a date'}</text><text className="map-source" x="400" y="448" textAnchor="end">Boundaries: geoBoundaries · CC BY 4.0</text>
      </svg>
    </div>
  </motion.div>
}

function SearchPanel({ routes, route, setRoute, date, setDate, dates, loading, onWatch, watched, showMap, showDate, onSwap }) {
  const [from,to] = route.split('-')
  const origins = [...new Set(routes.map(r => r.code.split('-')[0]))].sort()
  const destinations = routes.filter(r => r.code.startsWith(`${from}-`)).map(r => r.code.split('-')[1]).sort()
  return <motion.section className="search-panel" variants={slide}>
    <div className="search-heading"><div><span className="eyebrow">{showDate ? 'PLAN YOUR TRIP' : 'EXPLORE PRICES'}</span><h2>{showDate ? 'Check a route' : 'Choose a route'}</h2></div><button className={`watch-route ${watched ? 'saved' : ''}`} onClick={onWatch}><Heart size={16} fill={watched ? 'currentColor' : 'none'}/>{watched ? 'Watching route' : 'Watch route'}</button></div>
    <div className={`search-grid ${showDate ? '' : 'market-grid'}`}>
      <label><span>FROM</span><div className="airport-field"><Plane size={18}/><select value={from} onChange={e => { const next = routes.find(r => r.code.startsWith(`${e.target.value}-`)); if(next) setRoute(next.code) }}>{origins.map(x => <option key={x} value={x}>{cityNames[x]} ({x})</option>)}</select><ChevronDown size={16}/></div><small>{cityNames[from]} airport</small></label>
      <button type="button" className="route-swap" aria-label="Swap departure and destination" title="Swap departure and destination" disabled={!routes.some(item=>item.code===`${to}-${from}`)} onClick={onSwap}><ArrowLeftRight size={17}/></button>
      <label><span>TO</span><div className="airport-field"><Map size={18}/><select value={to} onChange={e => setRoute(`${from}-${e.target.value}`)}>{destinations.map(x => <option key={x} value={x}>{cityNames[x]} ({x})</option>)}</select><ChevronDown size={16}/></div><small>{cityNames[to]} airport</small></label>
      {showDate&&<label><span>TRAVEL DATE</span><div className="date-field"><CalendarDays size={18}/><select value={date} onChange={e => setDate(e.target.value)}>{dates.map(x => <option key={x} value={x}>{shortDay(x)} {x.slice(0,4)}</option>)}</select><ChevronDown size={16}/></div><small>Dates covered by this demo</small></label>}
    </div>
    {showMap&&<IndiaRouteMap route={route} date={date} loading={loading} routes={routes}/>}
  </motion.section>
}

function Tip({ children }) { return <div className="plain-tip"><Sparkles size={14}/><p>{children}</p></div> }
function ChartTip({ active, payload, label }) { return active && payload?.length ? <div className="chart-tip"><small>{label}</small><strong>{money(payload[0].value)}</strong></div> : null }

function Decision({ intelligence, prediction, booking, route, date }) {
  const d = intelligence?.data || {}
  const hist = d.historical || {}
  const forecasts = Object.entries(prediction?.data?.forecasts || {}).map(([key, value]) => ({ label:key.replace('next','').replace('Days',' days'), value:value.estimatedMedian })).filter(x => x.value)
  const rising = forecasts.length && forecasts.at(-1).value > d.currentFare
  const book = d.priceLevel === 'LOW'
  const high = d.priceLevel === 'HIGH'
  const best = booking?.data?.lowestMedianHorizon
  if (!date || !intelligence) return <section className="decision-empty"><Sparkles/><h2>{date ? 'Fare analysis is unavailable' : 'Choose a travel date'}</h2><p>{date ? 'Check that the data service is running, then try this route again.' : 'Available dates will appear after routes load.'}</p></section>
  if (d.status === 'INSUFFICIENT_DATA') return <section className="decision-empty"><Sparkles/><h2>We need a little more history for this exact selection.</h2><p>Try another available travel date or route.</p></section>
  return <motion.section className={`decision-hero ${book ? 'book' : 'wait'}`} variants={slide}>
    <div className="decision-copy"><span className="eyebrow">ROUTE PRICE CHECK · {route.replace('-', ' → ')}</span><h2>{book ? 'Lower than comparable fares' : high ? 'Higher than comparable fares' : 'Within the usual fare range'}</h2><p>For <strong>{shortDay(date)}</strong>, the lowest saved fare is <strong>{money(d.currentFare)}</strong>. That is <strong>{Math.abs(d.differenceFromMedianPercent || 0)}% {d.differenceFromMedianPercent <= 0 ? 'below' : 'above'}</strong> the usual comparable fare.</p><div className="decision-actions"><span className="decision-label"><CheckCircle2 size={16}/>{book ? 'LOWER FARE' : high ? 'HIGHER FARE' : 'TYPICAL FARE'}</span><span>Historical comparison, not a booking prediction.</span></div></div>
    <div className="decision-score"><small>HISTORICAL FARE SCORE</small><strong>{Math.round(d.dealScore || 0)}</strong><span>out of 100</span><div className="score-line"><i style={{width:`${d.dealScore || 0}%`}}/></div><p>Comparable median: <b>{money(hist.median)}</b></p><small>{intelligence.sampleCount} historical fares · score is a percentile, not a probability</small></div>
  </motion.section>
}

function ChartStatus({ state, children }) {
  return <div className="chart-status" role="status" aria-live="polite"><Clock3 size={22}/><strong>{state === 'loading' ? 'Loading analysis…' : state === 'error' ? 'Analysis could not be loaded' : 'Not enough comparable history yet'}</strong><p>{state === 'loading' ? 'This result will appear here shortly.' : state === 'error' ? 'Use Retry analysis below to try again.' : children}</p></div>
}

function DecisionDetails({ prediction, booking, states }) {
  const forecast = prediction?.data?.forecasts || {}
  const points = Object.entries(forecast).map(([key,v]) => ({ name:key.replace('next','').replace('Days','d'), price:v.estimatedMedian })).filter(x=>x.price)
  const best = booking?.data?.lowestMedianHorizon
  return <div className="decision-details">
    <motion.section className="card" variants={slide}><div className="card-title"><div><span className="eyebrow purple"><TrendingUp size={13}/> PRICE OUTLOOK</span><h3>Experimental price outlook</h3></div></div>
      <>{points.length ? <div className="chart-box small"><ResponsiveContainer><LineChart data={points}><CartesianGrid stroke="#e2e8ee" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:11}}/><YAxis hide/><Tooltip content={<ChartTip/>}/><Line type="monotone" dataKey="price" stroke="#2c6dc7" strokeWidth={3} dot={{r:4,fill:'#a99bff'}}/></LineChart></ResponsiveContainer></div> : <ChartStatus state={states.prediction}>A price outlook needs enough completed flights with matching price observations. No estimate is shown for this selection.</ChartStatus>}</>
      <Tip>These are estimates from past movements of comparable flights, not a guaranteed future price.</Tip>
    </motion.section>
    <motion.section className="card booking-answer" variants={slide}><span className="eyebrow green"><Clock3 size={13}/> HISTORICAL BOOKING WINDOW</span><strong>{best ? `${best} days before travel` : states.booking === 'loading' ? 'Loading booking history…' : states.booking === 'error' ? 'Analysis unavailable' : 'More history needed'}</strong><p>{best ? `Past completed trips on this route had their lowest usual fare around ${best} days before departure.` : 'More comparable completed trips are needed.'}</p><div className="booking-icon"><CalendarDays size={35}/></div></motion.section>
  </div>
}

function BookingChart({ booking, state, route }) {
  const curve = (booking?.data?.curve || []).filter(x => Number.isFinite(x.median)).map(x => ({ day:x.daysBeforeDeparture, median:x.median, count:x.count }))
  const checkpoints = [30,21,7,1].map(day => curve.find(x => x.day === day)).filter(Boolean)
  const advance = curve.find(x => x.day === 30)
  const late = curve.find(x => x.day === 1)
  const difference = advance && late ? late.median - advance.median : null
  return <motion.section className="card wide booking-history-chart" variants={slide}>
    <div className="card-title"><div><span className="eyebrow"><Clock3 size={13}/> BOOKING HISTORY · {route.replace('-', ' → ')}</span><h3>What did booking later cost?</h3></div></div>
    <p className="booking-scope">Completed departures on this route · {booking?.data?.completedDepartureCohort?.toLocaleString('en-IN') || '—'} departures tracked across 45 days. Changing the travel date does not change this route history.</p>
    {curve.length ? <>
      <div className="booking-checkpoints">{checkpoints.map(point => <div key={point.day}><span>{point.day} {point.day === 1 ? 'day' : 'days'} before</span><strong>{money(point.median)}</strong><small>{point.count?.toLocaleString('en-IN')} available fares</small></div>)}</div>
      <div className="chart-box"><ResponsiveContainer><AreaChart data={curve} margin={{top:12,right:16,bottom:20,left:0}}><CartesianGrid stroke="#e2e8e4" vertical={false}/><XAxis dataKey="day" type="number" domain={[1,45]} reversed ticks={[45,30,21,14,7,1]} axisLine={false} tickLine={false} tick={{fill:'#657873',fontSize:11}} label={{value:'Days before departure →',position:'insideBottom',offset:-14,fill:'#657873',fontSize:12}}/><YAxis width={60} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill:'#657873',fontSize:11}}/><Tooltip formatter={value=>[money(value),'Median fare']} labelFormatter={day=>`${day} days before departure`}/><Area isAnimationActive={false} type="linear" dataKey="median" stroke="#b95c3e" strokeWidth={2.5} fill="#b95c3e" fillOpacity={.10} dot={false}/></AreaChart></ResponsiveContainer></div>
      {difference !== null && <p className="booking-takeaway">One day before departure, the median was <strong>{money(Math.abs(difference))} {difference>=0?'higher':'lower'}</strong> than 30 days before on this route.</p>}
      <Tip>Simulated historical medians across airlines and travel dates. Missing fares are excluded, so available sample counts can differ. This does not predict the selected flight's future price.</Tip>
    </> : <ChartStatus state={state}>This comparison needs at least 20 completed departures tracked across all 45 days.</ChartStatus>}
  </motion.section>
}

function Calendar({ calendar, date, onSelect, onExplore }) {
  const rows = calendar?.data || []; const values = rows.map(x=>x.lowestFare).filter(Boolean); const low = Math.min(...values), high=Math.max(...values)
  return <motion.section className="card calendar-card" variants={slide}><div className="card-title"><div><span className="eyebrow green"><CalendarDays size={13}/> FLEXIBLE DATES</span><h3>Pick a lower-fare date</h3></div></div><div className="calendar-grid">{rows.map(x => { const score=(x.lowestFare-low)/(high-low||1); return <button type="button" key={x.departureDate} aria-pressed={date===x.departureDate} onClick={()=>onSelect(x.departureDate)} className={x.lowestFare == null ? 'unavailable' : score<.33?'cheap':score>.7?'pricey':''}><small>{shortDay(x.departureDate)}</small><strong>{x.lowestFare ? `₹${Math.round(x.lowestFare/100)/10}k` : '—'}</strong>{x.lowestFare===low&&<i>LOW</i>}{x.lowestFare == null && <small>No returned fare</small>}</button>})}</div><div className="calendar-next"><p>Selected: <strong>{shortDay(date)}</strong> · {money(rows.find(x=>x.departureDate===date)?.lowestFare)} lowest returned fare</p><button onClick={onExplore} disabled={!date}>See flights for {shortDay(date)} <ArrowRight size={16}/></button></div><Tip>Compare available fares across 45 days. No returned fare means missing availability, not an expensive date.</Tip></motion.section>
}

function Airlines({ airlines, state }) {
  const entries=Object.entries(airlines?.data?.airlines||{}).map(([code,v])=>({name:airlineNames[code]||code,fare:v.matchedCellFares?.median||0})).filter(x=>x.fare).sort((a,b)=>a.fare-b.fare)
  return <motion.section className="card" variants={slide}><div className="card-title"><div><span className="eyebrow orange"><Plane size={13}/> AIRLINE VIEW</span><h3>Airline fare history</h3></div></div><>{entries.length ? <div className="chart-box small"><ResponsiveContainer><BarChart data={entries} layout="vertical"><XAxis type="number" hide/><YAxis width={82} dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:10}}/><Tooltip content={<ChartTip/>}/><Bar dataKey="fare" radius={[0,8,8,0]}>{entries.map((_,i)=><Cell key={i} fill={i===0?'#247a5a':'#2c6dc7'}/>)}</Bar></BarChart></ResponsiveContainer></div> : <ChartStatus state={state}>There are not enough matched airline fares to compare this route.</ChartStatus>}</><Tip>{entries[0] ? <><strong>{entries[0].name}</strong> had the lowest median in this historical sample. Airlines may cover different departure times; compare today’s options in Flights.</> : 'Airline comparison is being prepared.'}</Tip></motion.section>
}

function BookingPlanner({ booking, state, date, route, calendar, onSelect }) {
  const [budget,setBudget]=useState('')
  const curve=(booking?.data?.curve||[]).filter(point=>Number.isFinite(point.median)&&point.count>=20)
  const best=curve.length?[...curve].sort((a,b)=>a.median-b.median||b.daysBeforeDeparture-a.daysBeforeDeparture)[0]:null
  const bookingDate=best&&date?new Date(new Date(date+'T00:00:00Z').getTime()-best.daysBeforeDeparture*86400000).toISOString().slice(0,10):null
  const passed=bookingDate&&bookingDate<AS_OF
  const matches=(calendar?.data||[]).filter(day=>day.lowestFare!=null&&budget!==''&&Number(budget)>0&&day.lowestFare<=Number(budget))
  return <section className="card trip-planner"><div className="card-title"><div><span className="eyebrow"><CalendarDays size={14}/> YOUR BOOKING PLAN · {route.replace('-', ' → ')}</span><h3>When should I book for {shortDay(date)}?</h3></div><span className="planner-tag">Simulated estimate</span></div>
    {best?<><div className="planner-facts"><div><span>Lowest historical median at</span><strong>{best.daysBeforeDeparture} days before</strong><small>For this trip: {shortDay(bookingDate)} {bookingDate.slice(0,4)}</small></div><div><span>Typical fare at that lead time</span><strong>{money(best.median)}</strong><small>{best.count.toLocaleString('en-IN')} available historical fares</small></div><div><span>Historical price range</span><strong>{money(best.p10)} – {money(best.p90)}</strong><small>Middle 80% of fares in the sample</small></div></div><p className="planner-reading">{passed?'That historical booking point is before the dataset’s observation date. It does not give a reason to wait now.':'This date maps the route’s lowest historical median to your travel date. It is a planning reference, not a confirmed future deal.'}</p><details><summary>What this estimate can tell you</summary><p>Calculated from completed simulated departures across airlines and travel dates, as of {AS_OF}. This is not a forecast for your selected departure or a guaranteed booking date. A current lowest offer and a historical median are different comparisons.</p></details></>:<ChartStatus state={state}>More completed departures are needed before a booking estimate can be shown.</ChartStatus>}
    <div className="budget-date-tool"><div><h4>Which dates fit my budget?</h4><p>Lowest available simulated fare per date; airline and time may differ.</p></div><label>Budget per person (₹)<input type="number" min="1" step="1" inputMode="numeric" placeholder="For example, 6000" value={budget} onChange={e=>setBudget(e.target.value)}/></label>{budget!==''&&<div className="budget-date-results" aria-live="polite"><p>{matches.length?`${matches.length} covered dates at or below ${money(Number(budget))}`:'No covered dates fit this budget. Try a higher amount.'}</p><div>{matches.slice(0,8).map(day=><button key={day.departureDate} onClick={()=>onSelect(day.departureDate)} aria-pressed={date===day.departureDate}><span>{shortDay(day.departureDate)}</span><strong>{money(day.lowestFare)}</strong></button>)}</div>{matches.length>8&&<small>Showing the earliest 8 matching dates.</small>}</div>}</div>
  </section>
}

function NearbyDates({ calendar, date, onSelect }) {
  const entries=calendar?.data||[]
  const center=entries.findIndex(x=>x.departureDate===date)
  const start=Math.max(0,Math.min(center-3,entries.length-7))
  const nearby=entries.slice(start,start+7)
  const current=entries.find(x=>x.departureDate===date)?.lowestFare
  const cheaper=nearby.filter(x=>x.lowestFare!=null&&current!=null&&x.lowestFare<current).sort((a,b)=>a.lowestFare-b.lowestFare)[0]
  if(!entries.length)return null
  return <section className="nearby-dates" aria-label="Compare nearby dates"><div className="nearby-heading"><div><span className="eyebrow">A LITTLE FLEXIBILITY</span><h3>{cheaper?`${money(current-cheaper.lowestFare)} less on ${shortDay(cheaper.departureDate)}`:'Compare nearby travel dates'}</h3></div><p>Lowest returned fare per date.<br/>Airline and departure time may differ.</p></div><div className="nearby-strip">{nearby.map(x=><button key={x.departureDate} aria-pressed={x.departureDate===date} onClick={()=>onSelect(x.departureDate)}><small>{new Date(x.departureDate+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short'})}</small><span>{shortDay(x.departureDate)}</span><strong>{x.lowestFare!=null?money(x.lowestFare):'No fare'}</strong>{x.departureDate===date?<em>Selected</em>:current!=null&&x.lowestFare!=null&&x.lowestFare<current?<em>{money(current-x.lowestFare)} less</em>:<em>View options</em>}</button>)}</div></section>
}

function Offers({ search, state, onSelect, selected }) {
  const [timeFilter,setTimeFilter]=useState('all'), [airline,setAirline]=useState('all'), [sort,setSort]=useState('price'), [limit,setLimit]=useState(10)
  useEffect(()=>{setTimeFilter('all');setAirline('all');setLimit(10)},[search])
  const [compared,setCompared]=useState([])
  const [budget,setBudget]=useState('')
  useEffect(()=>setBudget(''),[search])
  useEffect(()=>setCompared([]),[search])
  const offers=search?.data?.offers||[]
  const lowest=offers.length?Math.min(...offers.map(o=>o.amount)):null
  const earliest=offers.length?[...offers].sort((a,b)=>new Date(a.departureAt)-new Date(b.departureAt))[0].flightId:null
  const toggleCompare=id=>setCompared(ids=>ids.includes(id)?ids.filter(x=>x!==id):ids.length<3?[...ids,id]:ids)
  const visible=offers.filter(o=>(timeFilter==='all'||o.timeBand===timeFilter)&&(airline==='all'||o.airline===airline)&&(budget===''||o.amount<=Number(budget))).sort((a,b)=>sort==='price'?a.amount-b.amount:new Date(a.departureAt)-new Date(b.departureAt))
  const resetFilters=()=>{setTimeFilter('all');setAirline('all');setBudget('');setLimit(10)}
  const labels={all:'Any time',early_morning:'Morning',daytime:'Afternoon',evening:'Evening',night:'Night'}
  if (!search) return <section className="card"><ChartStatus state={state}>No observations were returned for this selection.</ChartStatus></section>
  const outcomes=search.data?.outcomes||{}
  const failures=Object.entries(outcomes).filter(([key])=>!['AVAILABLE','SOLD_OUT','NO_OFFER'].includes(key)).reduce((sum,[,n])=>sum+n,0)
  return <section className="card wide offers"><div className="card-title"><div><span className="eyebrow">FLIGHT OPTIONS</span><h3>{visible.length} {visible.length===1?'option':'options'} for your trip</h3></div><small>Simulated fares · {shortDay(search.asOf)}</small></div>
    {offers.length>0&&<div className="time-fare-choices" aria-label="Lowest fares by departure time">{Object.entries(labels).filter(([key])=>key!=='all').map(([key,label])=>{const options=offers.filter(o=>o.timeBand===key);const fare=options.length?Math.min(...options.map(o=>o.amount)):null;return <button key={key} disabled={!options.length} aria-pressed={timeFilter===key} onClick={()=>{setTimeFilter(timeFilter===key?'all':key);setLimit(10)}}><span>{label}</span><strong>{fare===null?'No offers':`From ${money(fare)}`}</strong><small>{options.length} {options.length===1?'flight':'flights'} · {key==='early_morning'?'Before 12 pm':key==='daytime'?'12–5 pm':key==='evening'?'5–9 pm':'After 9 pm'}</small></button>})}</div>}
    <div className="offer-controls"><label>Departure time<select value={timeFilter} onChange={e=>{setTimeFilter(e.target.value);setLimit(10)}}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Airline<select value={airline} onChange={e=>{setAirline(e.target.value);setLimit(10)}}><option value="all">All airlines</option>{[...new Set(offers.map(o=>o.airline))].map(code=><option key={code} value={code}>{airlineNames[code]||code}</option>)}</select></label><label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option value="price">Lowest fare</option><option value="departure">Departure time</option></select></label><label>Maximum fare (₹)<input type="number" min="1" step="1" inputMode="numeric" placeholder="Any budget" value={budget} onChange={e=>{setBudget(e.target.value);setLimit(10)}}/></label></div>
    {(timeFilter!=='all'||airline!=='all'||budget!=='')&&<div className="filter-summary"><span>{visible.length} of {offers.length} flights match your choices</span><button onClick={resetFilters}>Clear filters</button></div>}
    {compared.length>0&&<div className="flight-comparison" aria-label="Compare selected flights"><div className="comparison-heading"><div><span className="eyebrow">YOUR SHORTLIST</span><h4>Compare {compared.length} of 3 options</h4></div><button onClick={()=>setCompared([])}>Clear comparison</button></div><div className="comparison-options">{offers.filter(o=>compared.includes(o.flightId)).map(o=><article key={o.flightId}><button className="compare-remove" aria-label={`Remove ${o.flightNumber} from comparison`} onClick={()=>toggleCompare(o.flightId)}><X size={16}/></button><strong>{airlineNames[o.airline]||o.airline}</strong><small>{o.flightNumber}</small><b>{money(o.amount)}</b><span>Departs {flightTime(o.departureAt)}</span><small>{o.amount===lowest?'Lowest fare for this date':`${money(o.amount-lowest)} above the lowest fare`}</small><button onClick={()=>{resetFilters();setLimit(offers.length);onSelect(o)}}>Explore this flight</button></article>)}</div><p>Same route and travel date · simulated one-way fares. No live booking is offered.</p></div>}
    <div className="offer-list">{visible.slice(0,limit).map(o=><div className={`flight-option ${selected?.flightId===o.flightId?'is-open':''}`} key={o.flightId}><article className="offer"><div className="airline-logo">{o.airline}</div><div className="flight-identity"><strong>{airlineNames[o.airline]||o.airline}</strong><small>{o.flightNumber}</small><div className="flight-badges">{o.amount===lowest&&<span>Lowest fare</span>}{o.flightId===earliest&&<span>Earliest departure</span>}</div></div><div className="flight-schedule"><strong>{flightTime(o.departureAt)}</strong><small>{o.route.replace('-', ' → ')} · Nonstop</small></div><div className="offer-price"><strong>{money(o.amount)}</strong><small>One-way · simulated</small></div><div className="flight-option-actions"><button className="flight-detail-button" aria-expanded={selected?.flightId===o.flightId} onClick={()=>onSelect(selected?.flightId===o.flightId?null:o)}>{selected?.flightId===o.flightId?'Close details':'Fare details'}</button><label className="compare-toggle"><input type="checkbox" checked={compared.includes(o.flightId)} disabled={compared.length===3&&!compared.includes(o.flightId)} onChange={()=>toggleCompare(o.flightId)} aria-label={`Compare ${airlineNames[o.airline]||o.airline} ${o.flightNumber}`}/>Compare</label></div></article>{selected?.flightId===o.flightId&&<FlightHistory offer={o} onClose={()=>onSelect(null)}/>}</div>)}</div>
    {!visible.length&&<p className="no-offers">{offers.length?'No flights match these choices. Increase your budget or clear the filters.':failures?'Some searches failed to return a fare. This does not mean flights are sold out.':(outcomes.SOLD_OUT||outcomes.NO_OFFER)?'No available offers were returned for this date. Choose another covered date.':'No observations cover this selection.'}</p>}
    {visible.length>limit&&<button className="analysis-retry" onClick={()=>setLimit(n=>n+10)}>Show more flights ({visible.length-limit} remaining)</button>}
    {failures>0&&<p className="offer-coverage">{failures} simulated searches did not return a result; unavailable offers are excluded from prices.</p>}
  </section>
}


function FlightHistory({ offer, onClose }) {
  const [result,setResult]=useState(null), [status,setStatus]=useState('loading')
  useEffect(()=>{let active=true;setResult(null);setStatus('loading');api.history(offer.flightId).then(value=>{if(active){setResult(value);setStatus('ready')}}).catch(()=>{if(active)setStatus('error')});return()=>{active=false}},[offer.flightId])
  const rows=(result?.data?.history||[]).map(row=>({date:shortDay(row.searchDate),fare:row.amount}))
  const available=rows.filter(row=>Number.isFinite(row.fare))
  const historicalLow=available.length?Math.min(...available.map(row=>row.fare)):null
  const firstFare=available[0]?.fare
  return <section className="card selected-history" aria-label="Selected flight history"><div className="card-title"><div><span className="eyebrow">SELECTED FLIGHT</span><h3>{airlineNames[offer.airline]||offer.airline} · {offer.flightNumber}</h3><p>{offer.route.replace('-', ' → ')} · {shortDay(offer.departureDate)} · {flightTime(offer.departureAt)}</p></div><button onClick={onClose} aria-label="Close flight history"><X size={18}/></button></div><div className="flight-history-summary"><div><span>Latest fare</span><strong>{money(offer.amount)}</strong></div><div><span>Lowest recorded</span><strong>{money(historicalLow)}</strong></div><div><span>Since first available fare</span><strong>{firstFare!=null?`${offer.amount-firstFare>0?'+':''}${money(offer.amount-firstFare)}`:'—'}</strong></div></div>{historicalLow!=null&&<p className="history-reading">{offer.amount===historicalLow?'The latest fare is at its lowest recorded level.':`The latest fare is ${money(offer.amount-historicalLow)} above its lowest recorded level.`} Based on {available.length} available observations of this departure; it may rise or fall next.</p>}{rows.some(row=>row.fare!=null)?<div className="chart-box"><ResponsiveContainer><LineChart data={rows}><CartesianGrid vertical={false} stroke="#e2e8ee"/><XAxis dataKey="date" minTickGap={35}/><YAxis width={68} tickFormatter={v=>`₹${Math.round(v/1000)}k`}/><Tooltip content={<ChartTip/>}/><Line dataKey="fare" stroke="#407d72" strokeWidth={2} dot={rows.length===1} connectNulls={false}/></LineChart></ResponsiveContainer></div>:<p role="status">{status==='loading'?'Loading this flight’s history…':status==='error'?'History could not be loaded. Close this panel and select the flight again to retry.':'No available fare observations cover this departure.'}</p>}<p>Observations of this same departure through {shortDay(AS_OF)}. Gaps mean no fare was returned; they are not zero prices.</p></section>
}

function IndiaPulse({ heatmap, period, setPeriod, state }) {
  const routes=Object.entries(heatmap?.data?.routeChanges||{}).filter(([,value])=>Number.isFinite(value)).sort((a,b)=>b[1]-a[1])
  const up=routes.filter(x=>x[1]>0).slice(0,5), down=routes.filter(x=>x[1]<0).slice(-5).reverse()
  return <motion.div className="pulse-page" initial="hidden" animate="show" transition={{staggerChildren:.08}}>
    <motion.section className="fare-pulse-summary" variants={slide} aria-busy={state==='loading'}>
      <div className="fare-pulse-heading"><div><span className="eyebrow"><Map size={14}/> INDIA FARE PULSE</span><h2>Where fares are rising and falling</h2><p>Across covered domestic routes · simulated fares as of {shortDay(AS_OF)} {AS_OF.slice(0,4)}</p></div><div className="fare-pulse-period" role="group" aria-label="Fare comparison period">{[1,7,30].map(days=><button key={days} type="button" aria-pressed={period===days} onClick={()=>setPeriod(days)}>{days} {days===1?'day':'days'}</button>)}</div></div>
      {routes.length ? <div className="fare-pulse-stats"><div><span>Routes with higher fares</span><strong>{routes.filter(([,v])=>v>0).length}</strong></div><div><span>Routes with lower fares</span><strong>{routes.filter(([,v])=>v<0).length}</strong></div><div><span>Routes compared</span><strong>{routes.length}</strong></div></div> : <p className="fare-pulse-status" role="status">{state==='loading'?'Comparing route fares…':state==='error'?'Route comparison could not load. Use Retry analysis below.':'No comparable route fares for this period.'}</p>}
      <p className="fare-pulse-note">Compared with {period} {period===1?'day':'days'} earlier. Rankings below use the same period across all covered routes.</p>
    </motion.section>
    <div className="pulse-columns"><motion.section className="card" variants={slide}><span className="eyebrow orange"><ArrowUpRight size={13}/> GETTING COSTLIER</span><h3>Top fare increases</h3><div className="rank-list">{up.map(([r,v],i)=><div key={r}><b>0{i+1}</b><span>{r.replace('-', ' → ')}</span><strong>{pct(v)}</strong></div>)}</div></motion.section><motion.section className="card" variants={slide}><span className="eyebrow green"><ArrowDownRight size={13}/> GETTING CHEAPER</span><h3>Top fare decreases</h3><div className="rank-list">{down.map(([r,v],i)=><div key={r}><b>0{i+1}</b><span>{r.replace('-', ' → ')}</span><strong>{pct(v)}</strong></div>)}</div></motion.section></div>
    <motion.section className="card" variants={slide}><div className="card-title"><div><span className="eyebrow"><Activity size={13}/> ROUTE MOVEMENT</span><h3>All covered routes</h3></div></div><div className="route-tiles">{routes.map(([r,v])=><div key={r} className={v>3?'hot':v<-3?'cool':'steady'}><strong>{r.replace('-', ' → ')}</strong><span>{pct(v)}</span><small>{v>3?'FARES RISING':v<-3?'FARES FALLING':'STABLE'}</small></div>)}</div><Tip>These values compare equivalent fare groups at two different points in time. They show movement inside this dataset, not an official national price index.</Tip></motion.section>
  </motion.div>
}

function ConsumerPage({ view='decision' }) {
  const mode=view
  const [selectedOffer,setSelectedOffer]=useState(null)
  const [actionNotice,setActionNotice]=useState('')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [shared] = useSearchParams()
  const requestedRoute = shared.get('route') || 'BOM-DEL', requestedDate = shared.get('date') || ''
  const pendingDate = useRef(requestedDate)
  const swapRoute = () => { const [from,to]=route.split('-');pendingDate.current=date;setRoute(`${to}-${from}`) }
  const [routes,setRoutes]=useState([{code:'BOM-DEL'}]), [route,setRoute]=useState(requestedRoute), [date,setDate]=useState(''), [dates,setDates]=useState([]), [pulseWindow,setPulseWindow]=useState(30)
  const [loading,setLoading]=useState(false), [error,setError]=useState(''), [data,setData]=useState({})
  const [routeCalendar,setRouteCalendar]=useState(null)
  const [initialReady,setInitialReady]=useState(false)
  const [states,setStates]=useState({}), [retry,setRetry]=useState(0)
  const [savedTrips,setSavedTrips]=useState([]), [watchlist,setWatchlist]=useState([])
  useEffect(()=>setSelectedOffer(null),[route,date,mode])
  const requestId=useRef(0)
  useEffect(()=>{api.routes().then(r=>{setRoutes(r);if(!r.some(x=>x.code===route))setRoute(r[0]?.code||'BOM-DEL')}).catch(()=>setError('Routes could not be loaded. Please reload the page.'))},[])
  useEffect(()=>{if (!user) { setSavedTrips([]);setWatchlist([]);return } Promise.all([authApi.trips(),authApi.watchlist()]).then(([trips,watches])=>{setSavedTrips(trips);setWatchlist(watches)}).catch(()=>{})},[user])
  useEffect(()=>{let active=true;setDates([]);setDate('');setRouteCalendar(null);cached(`calendar:${route}`,()=>api.calendar(route)).then(result=>{if(!active)return;setRouteCalendar(result);const entries=(result.data||[]).filter(v=>v.collectionResults>0);const values=entries.map(v=>v.departureDate);const preferred=entries.filter(v=>v.availableOffers>0).sort((a,b)=>Math.abs((new Date(a.departureDate)-new Date(AS_OF))/86400000-21)-Math.abs((new Date(b.departureDate)-new Date(AS_OF))/86400000-21))[0]?.departureDate;setDates(values);setDate(values.includes(pendingDate.current) ? pendingDate.current : preferred||values[0]||'');if(!values.length){setInitialReady(true);setError('No travel dates are available for this route.');}pendingDate.current=''}).catch(()=>{if(active)setError('Travel dates could not be loaded.')});return()=>{active=false}},[route])
  useEffect(()=>{
    if(!date)return
    const id=++requestId.current
    const [from,to]=route.split('-')
    const jobs=mode==='decision' ? {
      search:()=>api.search(route,date), intelligence:()=>api.intelligence(from,to,date), prediction:()=>api.prediction(from,to,date), booking:()=>api.booking(route)
    } : mode==='route' ? {
      search:()=>api.search(route,date), booking:()=>api.booking(route), calendar:()=>api.calendar(route), airlines:()=>api.airlinesCompare(route)
    } : {
      heatmap:()=>api.heatmap(undefined,pulseWindow)
    }
    setError('');setData({});setLoading(true);setStates(Object.fromEntries(Object.keys(jobs).map(key=>[key,'loading'])))
    const primary=mode==='pulse'?'heatmap':'search'
    const run=(key,call)=>{
      const cacheKey=`${key}:${route}:${key==='heatmap'?pulseWindow:key==='index'?from:key==='search'||key==='intelligence'||key==='prediction'?date:''}`
      return cached(cacheKey,call).then(value=>{if(id===requestId.current){setData(old=>({...old,[key]:value}));setStates(old=>({...old,[key]:'ready'}));if(key==='intelligence'&&user)authApi.recordSearch(route,date).catch(()=>{})}}).catch(()=>{
        if(id===requestId.current){setStates(old=>({...old,[key]:'error'}));if(key===primary)setError('This result could not be loaded. Please try again.')}
      })
    }
    run(primary,jobs[primary]).finally(()=>{
      if(id===requestId.current){setLoading(false);setInitialReady(true)}
      Object.entries(jobs).filter(([key])=>key!==primary).forEach(([key,call])=>run(key,call))
    })
    return()=>{requestId.current++}
  },[route,date,mode,pulseWindow,user,retry])
  const savedTrip = savedTrips.some(item => item.route===route&&item.departureDate===date)
  const watched = watchlist.some(item => item.route===route)
  const withAccount = async action => {
    if (!user) {
      const path = mode === 'decision' ? '/flights' : mode === 'route' ? '/insights' : '/market'
      const next = `${path}?route=${encodeURIComponent(route)}${date ? `&date=${encodeURIComponent(date)}` : ''}`
      navigate(`/login?next=${encodeURIComponent(next)}`)
      return
    }
    try { await action() } catch (cause) { setActionNotice(cause.message) }
  }
  const saveTrip = () => withAccount(async () => { if(savedTrip){await authApi.removeTrip(savedTrips.find(item=>item.route===route&&item.departureDate===date).id);setActionNotice('Trip removed.')}else{await authApi.saveTrip({route,departureDate:date,savedFare:data.search?.data?.offers?.length?Math.min(...data.search.data.offers.map(o=>o.amount)):null});setActionNotice('Trip saved to your account.')}setSavedTrips(await authApi.trips()) })
  const watchRoute = () => withAccount(async () => { if(watched){await authApi.unwatch(watchlist.find(item=>item.route===route).id);setActionNotice('Route removed from watchlist.')}else{await authApi.watch(route);setActionNotice('Route added to watchlist.')}setWatchlist(await authApi.watchlist()) })
  const shareReport = async () => { const url=new URL(window.location.href);url.searchParams.set('route',route);url.searchParams.set('date',date);try{await navigator.clipboard.writeText(url.href);setActionNotice('Search link copied. Results reflect the dataset observation date.')}catch{window.prompt('Copy this search link',url.href)} }
  const page = mode==='decision' ? ['FLIGHTS','Find a flight. Understand the fare.','Compare departure times and fares, then explore the history behind the price.'] : mode==='route' ? ['ROUTE INSIGHTS','Explore your route','Compare dates, airlines and past price patterns.'] : ['FARE TRENDS','Track fare movement','See which routes are becoming more or less expensive.']
  if (!initialReady && !error) return <LoadingScreen label="Loading fare analysis"/>
  return <div className="app-shell consumer-shell"><SiteNav section={mode}/><main><div className="content"><div className="consumer-intro"><span className="page-kicker">{page[0]}</span><h1>{page[1]}</h1><p>{page[2]}</p></div><AnimatePresence>{error&&<motion.div className="error-banner" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}><TriangleAlert size={17}/>{error}</motion.div>}</AnimatePresence><motion.div initial="hidden" animate="show" transition={{staggerChildren:.06}}><SearchPanel routes={routes} route={route} setRoute={setRoute} date={date} setDate={setDate} dates={dates} loading={loading} onWatch={watchRoute} watched={watched} showMap={mode==='decision'} showDate={mode!=='pulse'} onSwap={swapRoute}/>{mode==='decision'&&<><div className="fare-actions"><button onClick={saveTrip}><Bookmark size={16} fill={savedTrip?'currentColor':'none'}/>{savedTrip?'Saved trip':'Save this trip'}</button><button onClick={()=>setActionNotice('Price alert delivery for the final dataset is coming soon. Save this trip to check its fare again from your account.')}><Bell size={16}/>Price alerts · soon</button><button onClick={shareReport}><Link2 size={16}/>Share search</button></div><NearbyDates calendar={routeCalendar} date={date} onSelect={setDate}/><BookingPlanner booking={data.booking} state={states.booking} date={date} route={route} calendar={routeCalendar} onSelect={setDate}/><div className="route-fare-context"><Decision intelligence={data.intelligence} prediction={data.prediction} booking={data.booking} route={route} date={date}/></div><Offers search={data.search} state={states.search} onSelect={setSelectedOffer} selected={selectedOffer}/><details className="more-fare-context"><summary>Explore historical booking patterns</summary><DecisionDetails prediction={data.prediction} booking={data.booking} states={states}/></details></>}{mode==='route'&&<div className="dashboard-grid"><BookingChart booking={data.booking} state={states.booking} route={route}/><Calendar calendar={data.calendar} date={date} onSelect={setDate} onExplore={()=>navigate(`/users?route=${encodeURIComponent(route)}&date=${date}`)}/><Airlines airlines={data.airlines} state={states.airlines}/></div>}{mode==='pulse'&&<IndiaPulse heatmap={data.heatmap} period={pulseWindow} setPeriod={setPulseWindow} state={states.heatmap}/>}</motion.div>{Object.values(states).includes('error')&&<button className="analysis-retry" onClick={()=>setRetry(value=>value+1)}>Retry analysis</button>}{actionNotice&&<div className="action-notice" role="status">{actionNotice}<button onClick={()=>setActionNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}</div><footer><Logo/><p>Simulated fares · observation date: {shortDay(AS_OF)} {AS_OF.slice(0,4)}</p></footer></main>{loading&&<div className="loading-rail"><i/></div>}</div>
}

export default ConsumerPage
