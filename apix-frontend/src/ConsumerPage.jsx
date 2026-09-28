import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowDownRight, ArrowLeftRight, ArrowUpRight, Bell, Bookmark, CalendarDays, CheckCircle2, ChevronDown, Clock3, Heart, Link2, Map, Plane, Route, Sparkles, TrendingUp, TriangleAlert, X } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from './api'
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
    <div className="route-map-copy"><span className="eyebrow"><Map size={13}/> SELECTED JOURNEY</span><h3>{cityNames[from]} <b>to</b> {cityNames[to]}</h3><p>{date ? `${shortDay(date)} 2026 · One-way fare analysis` : 'Choose an available travel date'}</p><div className="route-map-legend"><span><i className="origin-dot"/>{from}</span><span><i className="destination-dot"/>{to}</span></div><div className={`auto-analysis ${loading ? 'working' : ''}`}><i/>{!date ? 'Choose a date to analyse' : loading ? 'Analysing this fare…' : 'See the fare analysis below'}</div></div>
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
      {showDate&&<label><span>TRAVEL DATE</span><div className="date-field"><CalendarDays size={18}/><select value={date} onChange={e => setDate(e.target.value)}>{dates.map(x => <option key={x} value={x}>{shortDay(x)} 2026</option>)}</select><ChevronDown size={16}/></div><small>Dates covered by this demo</small></label>}
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
  const book = d.priceLevel === 'LOW' || Number(d.dealScore) >= 65 || (rising && Number(d.dealScore) >= 55)
  const best = booking?.data?.lowestMedianHorizon
  if (!date || !intelligence) return <section className="decision-empty"><Sparkles/><h2>{date ? 'Fare analysis is unavailable' : 'Choose a travel date'}</h2><p>{date ? 'Check that the data service is running, then try this route again.' : 'Available dates will appear after routes load.'}</p></section>
  if (d.status === 'INSUFFICIENT_DATA') return <section className="decision-empty"><Sparkles/><h2>We need a little more history for this exact selection.</h2><p>Try another available travel date or route.</p></section>
  return <motion.section className={`decision-hero ${book ? 'book' : 'wait'}`} variants={slide}>
    <div className="decision-copy"><span className="eyebrow">PRICE CHECK · {route.replace('-', ' → ')}</span><h2>{book ? 'Good time to book' : 'Prices are higher than usual'}</h2><p>For <strong>{shortDay(date)}</strong>, the lowest saved fare is <strong>{money(d.currentFare)}</strong>. That is <strong>{Math.abs(d.differenceFromMedianPercent || 0)}% {d.differenceFromMedianPercent <= 0 ? 'below' : 'above'}</strong> the usual comparable fare.</p><div className="decision-actions"><span className="decision-label"><CheckCircle2 size={16}/>{book ? 'GOOD FARE' : 'PRICE IS HIGH'}</span><span>{book ? (rising ? 'Past patterns suggest fares may rise.' : 'This is below similar past prices.') : 'Keep an eye on this route before deciding.'}</span></div></div>
    <div className="decision-score"><small>DEAL SCORE</small><strong>{Math.round(d.dealScore || 0)}</strong><span>out of 100</span><div className="score-line"><i style={{width:`${d.dealScore || 0}%`}}/></div><p>Typical fare: <b>{money(hist.median)}</b></p></div>
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
    <motion.section className="card" variants={slide}><div className="card-title"><div><span className="eyebrow purple"><TrendingUp size={13}/> PRICE OUTLOOK</span><h3>If you wait, what may happen?</h3></div></div>
      <>{points.length ? <div className="chart-box small"><ResponsiveContainer><LineChart data={points}><CartesianGrid stroke="#e2e8ee" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:11}}/><YAxis hide/><Tooltip content={<ChartTip/>}/><Line type="monotone" dataKey="price" stroke="#2c6dc7" strokeWidth={3} dot={{r:4,fill:'#a99bff'}}/></LineChart></ResponsiveContainer></div> : <ChartStatus state={states.prediction}>A price outlook needs enough completed flights with matching price observations. No estimate is shown for this selection.</ChartStatus>}</>
      <Tip>These are estimates from past movements of comparable flights, not a guaranteed future price.</Tip>
    </motion.section>
    <motion.section className="card booking-answer" variants={slide}><span className="eyebrow green"><Clock3 size={13}/> BEST BOOKING TIME</span><strong>{best ? `${best} days before travel` : states.booking === 'loading' ? 'Loading booking history…' : states.booking === 'error' ? 'Analysis unavailable' : 'More history needed'}</strong><p>{best ? `Past completed trips on this route had their lowest usual fare around ${best} days before departure.` : 'More comparable completed trips are needed.'}</p><div className="booking-icon"><CalendarDays size={35}/></div></motion.section>
  </div>
}

function BookingChart({ booking, state }) {
  const curve = (booking?.data?.curve || []).map(x => ({ day:x.daysBeforeDeparture, median:x.median })).filter(x=>x.median)
  return <motion.section className="card wide" variants={slide}><div className="card-title"><div><span className="eyebrow"><Clock3 size={13}/> FARE JOURNEY</span><h3>How prices change before departure</h3></div></div><>{curve.length ? <div className="chart-box"><ResponsiveContainer><AreaChart data={curve}><defs><linearGradient id="fareArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c6dc7" stopOpacity=".32"/><stop offset="1" stopColor="#2c6dc7" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#e2e8ee" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:11}}/><YAxis hide/><Tooltip content={<ChartTip/>}/><Area type="monotone" dataKey="median" stroke="#2c6dc7" strokeWidth={3} fill="url(#fareArea)" dot={curve.length === 1 ? { r:4 } : false}/></AreaChart></ResponsiveContainer></div> : <ChartStatus state={state}>The fare journey needs completed trips observed at different booking lead times.</ChartStatus>}</><Tip>Moving left means travelling closer to departure. Prices usually become less predictable in the last few days.</Tip></motion.section>
}

function Calendar({ calendar }) {
  const rows = calendar?.data || []; const values = rows.map(x=>x.lowestFare).filter(Boolean); const low = Math.min(...values), high=Math.max(...values)
  return <motion.section className="card calendar-card" variants={slide}><div className="card-title"><div><span className="eyebrow green"><CalendarDays size={13}/> FLEXIBLE DATES</span><h3>Pick a lower-fare date</h3></div></div><div className="calendar-grid">{rows.slice(0,35).map(x => { const score=(x.lowestFare-low)/(high-low||1); return <div key={x.departureDate} className={score<.33?'cheap':score>.7?'pricey':''}><small>{shortDay(x.departureDate)}</small><strong>{x.lowestFare ? `₹${Math.round(x.lowestFare/100)/10}k` : '—'}</strong>{x.lowestFare===low&&<i>LOW</i>}</div>})}</div><Tip>Green dates have the lower prices in this 45-day travel window.</Tip></motion.section>
}

function Airlines({ airlines, state }) {
  const entries=Object.entries(airlines?.data?.airlines||{}).map(([code,v])=>({name:airlineNames[code]||code,fare:v.matchedCellFares?.median||0})).filter(x=>x.fare).sort((a,b)=>a.fare-b.fare)
  return <motion.section className="card" variants={slide}><div className="card-title"><div><span className="eyebrow orange"><Plane size={13}/> AIRLINE VIEW</span><h3>Who is usually cheaper?</h3></div></div><>{entries.length ? <div className="chart-box small"><ResponsiveContainer><BarChart data={entries} layout="vertical"><XAxis type="number" hide/><YAxis width={82} dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill:'#788b9a',fontSize:10}}/><Tooltip content={<ChartTip/>}/><Bar dataKey="fare" radius={[0,8,8,0]}>{entries.map((_,i)=><Cell key={i} fill={i===0?'#247a5a':'#2c6dc7'}/>)}</Bar></BarChart></ResponsiveContainer></div> : <ChartStatus state={state}>There are not enough matched airline fares to compare this route.</ChartStatus>}</><Tip>{entries[0] ? <><strong>{entries[0].name}</strong> had the lowest typical comparable fare on this route.</> : 'Airline comparison is being prepared.'}</Tip></motion.section>
}

function Offers({ search }) {
  const [timeFilter, setTimeFilter] = useState('all')
  const offers=search?.data?.offers||[]
  const visible=timeFilter==='all' ? offers : offers.filter(o=>o.timeBand===timeFilter)
  const labels={all:'All flights',early_morning:'Morning',daytime:'Afternoon',evening:'Evening',night:'Night'}
  return <motion.section className="card wide offers" variants={slide}><div className="card-title offer-heading"><div><span className="eyebrow"><Plane size={13}/> AVAILABLE OPTIONS</span><h3>Choose a flight time</h3></div><div className="time-filters">{Object.entries(labels).map(([key,label])=><button key={key} className={timeFilter===key?'active':''} onClick={()=>setTimeFilter(key)}>{label}</button>)}</div></div><div className="offer-list">{visible.length ? visible.slice(0,5).map(o=><div className="offer" key={o.flightId}><div className="airline-logo">{(airlineNames[o.airline]||o.airline).slice(0,1)}</div><div><strong>{airlineNames[o.airline]||o.airline}</strong><small>Departs {flightTime(o.departureAt)} · {String(o.timeBand).replace('_',' ')}</small></div><div className="offer-route"><span>{o.route.split('-')[0]}</span><div><i/><Plane size={14}/></div><span>{o.route.split('-')[1]}</span></div><div className="offer-price"><strong>{money(o.amount)}</strong><small>FARE ESTIMATE</small></div></div>) : <div className="no-offers">No flight is available in this time slot for the selected date.</div>}</div></motion.section>
}

function IndiaPulse({ heatmap, index, anomalies, period, setPeriod, city }) {
  const routes=Object.entries(heatmap?.data?.routeChanges||{}).sort((a,b)=>b[1]-a[1])
  const up=routes.filter(x=>x[1]>0).slice(0,5), down=routes.filter(x=>x[1]<0).slice(-5).reverse()
  return <motion.div className="pulse-page" initial="hidden" animate="show" transition={{staggerChildren:.08}}>
    <motion.section className="pulse-hero" variants={slide}><span className="eyebrow"><Map size={13}/> INDIA FARE PULSE · {cityNames[city]}</span><h2>Which routes are changing fastest?</h2><p>Choose a comparison period. The values update from the stored observations.</p><div><strong>{pct(index?.changePercent)}</strong><span>{period}-day movement from {cityNames[city]}</span><small>{anomalies || 0} unusual prices on your route</small></div><div className="mode-tabs pulse-period"><button className={period===1?'active':''} onClick={()=>setPeriod(1)}>1 day</button><button className={period===7?'active':''} onClick={()=>setPeriod(7)}>7 days</button><button className={period===30?'active':''} onClick={()=>setPeriod(30)}>30 days</button></div></motion.section>
    <div className="pulse-columns"><motion.section className="card" variants={slide}><span className="eyebrow orange"><ArrowUpRight size={13}/> GETTING COSTLIER</span><h3>Top fare increases</h3><div className="rank-list">{up.map(([r,v],i)=><div key={r}><b>0{i+1}</b><span>{r.replace('-', ' → ')}</span><strong>{pct(v)}</strong></div>)}</div></motion.section><motion.section className="card" variants={slide}><span className="eyebrow green"><ArrowDownRight size={13}/> GETTING CHEAPER</span><h3>Top fare decreases</h3><div className="rank-list">{down.map(([r,v],i)=><div key={r}><b>0{i+1}</b><span>{r.replace('-', ' → ')}</span><strong>{pct(v)}</strong></div>)}</div></motion.section></div>
    <motion.section className="card" variants={slide}><div className="card-title"><div><span className="eyebrow"><Activity size={13}/> ROUTE MOVEMENT</span><h3>All covered routes</h3></div></div><div className="route-tiles">{routes.map(([r,v])=><div key={r} className={v>3?'hot':v<-3?'cool':'steady'}><strong>{r.replace('-', ' → ')}</strong><span>{pct(v)}</span><small>{v>3?'FARES RISING':v<-3?'FARES FALLING':'STABLE'}</small></div>)}</div><Tip>These values compare equivalent fare groups at two different points in time. They show movement inside this dataset, not an official national price index.</Tip></motion.section>
  </motion.div>
}

function ConsumerPage({ view='decision' }) {
  const mode=view
  const [actionNotice,setActionNotice]=useState('')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [shared] = useSearchParams()
  const requestedRoute = shared.get('route') || 'BOM-DEL', requestedDate = shared.get('date') || ''
  const pendingDate = useRef(requestedDate)
  const swapRoute = () => { const [from,to]=route.split('-');pendingDate.current=date;setRoute(`${to}-${from}`) }
  const [routes,setRoutes]=useState([{code:'BOM-DEL'}]), [route,setRoute]=useState(requestedRoute), [date,setDate]=useState(''), [dates,setDates]=useState([]), [pulseWindow,setPulseWindow]=useState(30)
  const [loading,setLoading]=useState(false), [error,setError]=useState(''), [data,setData]=useState({})
  const [initialReady,setInitialReady]=useState(false)
  const [states,setStates]=useState({}), [retry,setRetry]=useState(0)
  const [savedTrips,setSavedTrips]=useState([]), [watchlist,setWatchlist]=useState([])
  const requestId=useRef(0)
  useEffect(()=>{api.routes().then(r=>{setRoutes(r);if(!r.some(x=>x.code===route))setRoute(r[0]?.code||'BOM-DEL')}).catch(()=>setError('Routes could not be loaded. Please reload the page.'))},[])
  useEffect(()=>{if (!user) { setSavedTrips([]);setWatchlist([]);return } Promise.all([authApi.trips(),authApi.watchlist()]).then(([trips,watches])=>{setSavedTrips(trips);setWatchlist(watches)}).catch(()=>{})},[user])
  useEffect(()=>{let active=true;setDates([]);setDate('');cached(`calendar:${route}`,()=>api.calendar(route)).then(result=>{if(!active)return;const values=(result.data||[]).filter(v=>v.collectionResults>0).map(v=>v.departureDate);setDates(values);setDate(values.includes(pendingDate.current) ? pendingDate.current : values[Math.min(20,values.length-1)]||'');if(!values.length)setError('No travel dates are available for this route.');pendingDate.current=''}).catch(()=>{if(active)setError('Travel dates could not be loaded.')});return()=>{active=false}},[route])
  useEffect(()=>{
    if(!date)return
    const id=++requestId.current
    const [from,to]=route.split('-')
    const jobs=mode==='decision' ? {
      intelligence:()=>api.intelligence(from,to,date), prediction:()=>api.prediction(from,to,date), booking:()=>api.booking(route)
    } : mode==='route' ? {
      search:()=>api.search(route,date), booking:()=>api.booking(route), calendar:()=>api.calendar(route), airlines:()=>api.airlinesCompare(route)
    } : {
      heatmap:()=>api.heatmap(undefined,pulseWindow), index:()=>api.index(undefined,from), anomalies:()=>api.anomalies(route)
    }
    setError('');setData({});setLoading(true);setStates(Object.fromEntries(Object.keys(jobs).map(key=>[key,'loading'])))
    const primary=mode==='decision'?'intelligence':mode==='route'?'search':'heatmap'
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
  const index=data.index?.data?.[pulseWindow===1?'daily':pulseWindow===7?'weekly':'monthly'], anomalies=data.anomalies?.data?.anomalies?.length||0
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
  const saveTrip = () => withAccount(async () => { if(savedTrip){await authApi.removeTrip(savedTrips.find(item=>item.route===route&&item.departureDate===date).id);setActionNotice('Trip removed.')}else{await authApi.saveTrip({route,departureDate:date,savedFare:data.intelligence?.data?.currentFare??null});setActionNotice('Trip saved to your account.')}setSavedTrips(await authApi.trips()) })
  const watchRoute = () => withAccount(async () => { if(watched){await authApi.unwatch(watchlist.find(item=>item.route===route).id);setActionNotice('Route removed from watchlist.')}else{await authApi.watch(route);setActionNotice('Route added to watchlist.')}setWatchlist(await authApi.watchlist()) })
  const shareReport = async () => { const url=new URL(window.location.href);url.searchParams.set('route',route);url.searchParams.set('date',date);try{await navigator.clipboard.writeText(url.href);setActionNotice('Shareable fare report link copied.')}catch{window.prompt('Copy this fare report link',url.href)} }
  const page = mode==='decision' ? ['FLIGHTS','Check your fare','See how a flight price compares with similar trips.'] : mode==='route' ? ['ROUTE INSIGHTS','Explore your route','Compare dates, airlines and past price patterns.'] : ['FARE TRENDS','Track fare movement','See which routes are becoming more or less expensive.']
  if (!initialReady && !error) return <LoadingScreen label="Loading fare analysis"/>
  return <div className="app-shell consumer-shell"><SiteNav section={mode}/><main><div className="content"><div className="consumer-intro"><span className="page-kicker">{page[0]}</span><h1>{page[1]}</h1><p>{page[2]}</p></div><AnimatePresence>{error&&<motion.div className="error-banner" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}><TriangleAlert size={17}/>{error}</motion.div>}</AnimatePresence><motion.div initial="hidden" animate="show" transition={{staggerChildren:.06}}><SearchPanel routes={routes} route={route} setRoute={setRoute} date={date} setDate={setDate} dates={dates} loading={loading} onWatch={watchRoute} watched={watched} showMap={mode==='decision'} showDate={mode!=='pulse'} onSwap={swapRoute}/>{mode==='decision'&&<><Decision intelligence={data.intelligence} prediction={data.prediction} booking={data.booking} route={route} date={date}/><div className="fare-actions"><button onClick={saveTrip}><Bookmark size={16} fill={savedTrip?'currentColor':'none'}/>{savedTrip?'Saved trip':'Save this trip'}</button><button onClick={()=>navigate(user?'/users/account':'/login?next=%2Fusers%2Faccount')}><Bell size={16}/>Set price alert</button><button onClick={shareReport}><Link2 size={16}/>Share fare report</button></div><DecisionDetails prediction={data.prediction} booking={data.booking} states={states}/></>}{mode==='route'&&<div className="dashboard-grid"><BookingChart booking={data.booking} state={states.booking}/><Calendar calendar={data.calendar}/><Airlines airlines={data.airlines} state={states.airlines}/><Offers search={data.search}/></div>}{mode==='pulse'&&<IndiaPulse heatmap={data.heatmap} index={index} anomalies={anomalies} period={pulseWindow} setPeriod={setPulseWindow} city={route.split('-')[0]}/>}</motion.div>{Object.values(states).includes('error')&&<button className="analysis-retry" onClick={()=>setRetry(value=>value+1)}>Retry analysis</button>}{actionNotice&&<div className="action-notice" role="status">{actionNotice}<button onClick={()=>setActionNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}</div><footer><Logo/><p>Simulated fares · information date: 13 September 2026</p></footer></main>{loading&&<div className="loading-rail"><i/></div>}</div>
}

export default ConsumerPage
