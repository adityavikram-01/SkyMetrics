import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import SiteNav from '../SiteNav';
import { travellerApi } from './travellerApi';
import { rupees } from './offerModel';
import './users-workspace.css';
export default function FareTrends() {
 const [days,setDays]=useState(7),[data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');travellerApi.trends(days,controller.signal).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[days]);
 return <div className="uw"><SiteNav section="market"/><main><div className="uw-section-title"><div><h1>Fare trends</h1><p>See which routes became cheaper or more expensive.</p></div><div className="uw-periods" aria-label="Comparison period">{[1,7,30].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{n} {n===1?'day':'days'}</button>)}</div></div><p className="uw-note">Simulated economy fares, compared at the same 21-day booking horizon. Route averages include different flights; these are not forecasts.</p>{error?<p role="alert">{error}</p>:!data?<p role="status">Loading fare trends…</p>:<><p>Observed {data.asOf} · {data.routes.length} routes</p><div className="uw-trend-grid">{[{title:'Getting cheaper',rows:data.routes.filter(r=>r.changePct<0).sort((a,b)=>a.changePct-b.changePct)},{title:'Getting costlier',rows:data.routes.filter(r=>r.changePct>=0)}].map(group=><section className="uw-trend-card" key={group.title}><h2>{group.title}</h2>{group.rows.length?group.rows.map(r=><Link className="uw-trend-row" key={r.route} to={'/users?route='+r.route}><strong>{r.route.replace('-',' → ')}</strong><span>{rupees(r.currentFare)} average</span><b className={r.changePct<0?'uw-falling':'uw-rising'}>{r.changePct>0?'+':''}{r.changePct}%</b></Link>):<p>No routes in this group for this period.</p>}</section>)}</div></>}</main></div>;
}
