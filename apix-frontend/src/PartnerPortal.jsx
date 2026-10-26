import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, Code2, Copy, Database, LockKeyhole, Play, ShieldCheck } from 'lucide-react'
import { AreaLayout } from './AreaLayout'
import { useAuth } from './AuthContext'
import { authApi } from './authApi'
import { AS_OF, DATASET_ID } from './api'
import './developer.css'

const qs = values => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null)).toString()
const endpoints = [
  { id:'intelligence', group:'Fare decisions', name:'Price intelligence', method:'GET', path:({origin,destination,date})=>`/api/v1/intelligence/${origin}/${destination}?${qs({datasetId:DATASET_ID,departureDate:date,asOf:AS_OF})}`, description:'Compare a quoted fare with similar saved observations and get a deal score.', fields:'data.currentFare · data.historical.median · data.dealScore' },
  { id:'search', group:'Fare decisions', name:'Fare search', method:'GET', path:({route,date})=>`/api/v1/fares/search?${qs({datasetId:DATASET_ID,route,departureDate:date,asOf:AS_OF,page:0,size:8})}`, description:'Browse the simulated flight offers behind a route and travel date.', fields:'Route, airline, departure time, total fare' },
  { id:'prediction', group:'Fare decisions', name:'Fare prediction', method:'GET', path:({origin,destination,date})=>`/api/v1/prediction/${origin}/${destination}?${qs({datasetId:DATASET_ID,departureDate:date,asOf:AS_OF})}`, description:'Short-horizon statistical estimate based on observed fare transitions.', fields:'Predicted price path · confidence · booking suggestion' },
  { id:'calendar', group:'Travel planning', name:'Fare calendar', method:'GET', path:({route})=>`/api/v1/fares/calendar?${qs({datasetId:DATASET_ID,route,asOf:AS_OF})}`, description:'Compare fare levels over available departure dates.', fields:'Date · fare · relative price level' },
  { id:'booking', group:'Travel planning', name:'Booking window', method:'GET', path:({route})=>`/api/v1/routes/${route}/booking-window?${qs({datasetId:DATASET_ID,asOf:AS_OF})}`, description:'Find lead times that tended to be cheaper for this route.', fields:'Days before departure · fare distribution' },
  { id:'airlines', group:'Market analysis', name:'Airline comparison', method:'GET', path:({route})=>`/api/v1/airlines/compare?${qs({datasetId:DATASET_ID,route,asOf:AS_OF,days:90})}`, description:'Compare airlines on the same route and lookback period.', fields:'Airline · median fare · price spread' },
  { id:'statistics', group:'Market analysis', name:'Route statistics', method:'GET', path:({route})=>`/api/v1/routes/${route}/statistics?${qs({datasetId:DATASET_ID,asOf:AS_OF,days:90})}`, description:'A route-level summary of stored fare observations.', fields:'Sample size · fare distribution · movement' },
  { id:'volatility', group:'Market analysis', name:'Fare volatility', method:'GET', path:({route})=>`/api/v1/routes/${route}/volatility?${qs({datasetId:DATASET_ID,asOf:AS_OF,days:90})}`, description:'Measure how much fares moved over the selected period.', fields:'Volatility score · classification · daily movement' },
  { id:'index', group:'Market analysis', name:'Airfare index', method:'GET', path:()=>`/api/v1/indices/airfare?${qs({datasetId:DATASET_ID,asOf:AS_OF})}`, description:'Explore the experimental index computed from a matched simulated fare basket.', fields:'Index level · change · coverage' },
  { id:'anomalies', group:'Market analysis', name:'Fare anomalies', method:'GET', path:({route})=>`/api/v1/analytics/anomalies?${qs({datasetId:DATASET_ID,route,asOf:AS_OF})}`, description:'Identify unusual fares relative to comparable observations.', fields:'Fare · expected range · severity' },
]
const groups = ['Fare decisions','Travel planning','Market analysis']
const codeSnippet = path => `fetch('${path}')\n  .then(response => response.json())\n  .then(data => console.log(data))`

export default function PartnerPortal() {
  const { user } = useAuth()
  const approved = user?.role === 'PARTNER' || user?.role === 'ADMIN'
  const [overview,setOverview] = useState(null)
  const [routes,setRoutes] = useState([])
  const [route,setRoute] = useState('DEL-BOM')
  const [date,setDate] = useState('2026-10-20')
  const [selected,setSelected] = useState('intelligence')
  const [result,setResult] = useState(null)
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)
  const [copied,setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/v1/catalog/routes').then(response=>response.json()).then(items=>setRoutes(items.map(item=>item.code))).catch(()=>{})
  }, [])
  useEffect(() => { if (approved) authApi.partner().then(setOverview).catch(()=>{}) }, [approved])
  const endpoint = endpoints.find(item=>item.id===selected)
  const [origin,destination] = route.split('-')
  const path = useMemo(()=>endpoint.path({route,origin,destination,date}),[endpoint,route,origin,destination,date])
  const run = async () => {
    setLoading(true);setError('');setResult(null)
    const controller = new AbortController()
    const timeout = setTimeout(()=>controller.abort(),20000)
    try {
      const response = await fetch(path,{signal:controller.signal})
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || body.error || `Request failed (${response.status})`)
      setResult({status:response.status,body})
    } catch(cause) { setError(cause.name==='AbortError'?'The request timed out. Try another endpoint.':cause.message) }
    finally { clearTimeout(timeout);setLoading(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(codeSnippet(path));setCopied(true);setTimeout(()=>setCopied(false),1800) }
    catch { setError('Copy is unavailable here; select the example text instead.') }
  }

  return <AreaLayout section="developers" eyebrow="DEVELOPER WORKSPACE" title="Build with SkyMetrics." description="Explore the working airfare APIs, inspect their responses, and see exactly what access is available today.">
    <div className="dev-status-bar"><span><Database size={15}/> Simulated dataset</span><span>{routes.length || '—'} routes</span><span>{endpoints.length} documented live endpoints</span><span>Snapshot: {AS_OF}</span></div>
    <div className="dev-layout">
      <aside className="dev-sidebar" aria-label="API endpoints">
        <div className="dev-side-title">API REFERENCE <span>v1</span></div>
        {groups.map(group=><div className="dev-group" key={group}><div className="dev-group-title">{group}</div>{endpoints.filter(item=>item.group===group).map(item=><button key={item.id} type="button" className={selected===item.id?'active':''} onClick={()=>{setSelected(item.id);setResult(null);setError('')}}><span className="dev-method">{item.method}</span>{item.name}<ArrowRight size={13}/></button>)}</div>)}
        <div className="dev-side-note"><ShieldCheck size={17}/><p>These read-only endpoints use the simulated dataset and require a signed-in browser session. Partner access is assigned by the owner.</p></div>
      </aside>
      <div className="dev-main">
        <section className="dev-panel dev-endpoint">
          <div className="dev-eyebrow">{endpoint.group} / {endpoint.method}</div>
          <h2>{endpoint.name}</h2><p>{endpoint.description}</p>
          <div className="dev-param-row"><label>Route<select value={route} onChange={event=>setRoute(event.target.value)}>{(routes.length?routes:['DEL-BOM']).map(item=><option key={item} value={item}>{item.replace('-',' → ')}</option>)}</select></label><label>Travel date<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><button type="button" onClick={run} disabled={loading}><Play size={15} fill="currentColor"/>{loading?'Running…':'Send request'}</button></div>
          <div className="dev-request-line"><span>GET</span><code>{path}</code></div>
          <div className="dev-field-hint"><strong>What to inspect</strong><span>{endpoint.fields}</span></div>
        </section>
        <section className="dev-panel dev-console"><div className="dev-console-head"><div><Code2 size={17}/><strong>Response</strong></div>{result&&<span className="dev-success">{result.status} OK</span>}</div>{error?<div className="dev-console-error" role="alert">{error}</div>:result?<pre>{JSON.stringify(result.body,null,2)}</pre>:<div className="dev-console-empty">Choose an endpoint and send a request to inspect its actual response.</div>}</section>
        <section className="dev-panel dev-code-panel"><div className="dev-console-head"><div><Code2 size={17}/><strong>Use it in JavaScript</strong></div><button type="button" onClick={copy}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Copied':'Copy'}</button></div><pre>{codeSnippet(path)}</pre><p>Run this from the signed-in SkyMetrics site at <code>http://127.0.0.1:5174</code>. The local proxy forwards requests to the backend.</p></section>
      </div>
    </div>
    <div className="dev-bottom-grid"><section className="dev-panel"><div className="dev-card-icon"><LockKeyhole size={19}/></div><h2>Partner workspace</h2>{approved?<><p>Your account has {user.role==='ADMIN'?'owner/admin':'partner'} access. The protected partner endpoint reports <strong>{overview?.status||'loading…'}</strong>.</p><p>API keys, quotas, exports and billing have not been implemented. You can use the session-protected local endpoints above today.</p></>:<><p>A partner role is assigned by the SkyMetrics administrator. Public signup provides traveller access only.</p><Link className="dev-link" to="/login?next=%2Fdevelopers">Sign in to your account <ArrowRight size={15}/></Link></>}</section><section className="dev-panel"><div className="dev-card-icon"><Database size={19}/></div><h2>Understand the data</h2><p>Fares, price patterns and index values here come from a generated historical dataset. They are suitable for prototyping integrations, not booking tickets or reporting official inflation.</p><p>Every example fixes <code>datasetId</code> and <code>asOf</code> so results are reproducible. Prediction is statistical and may report insufficient support.</p></section></div>
  </AreaLayout>
}
