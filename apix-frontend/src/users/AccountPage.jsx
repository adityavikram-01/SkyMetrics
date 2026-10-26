import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../AuthContext';
import { authApi } from '../authApi';
import SiteNav from '../SiteNav';
import { rupees, dayLabel } from './offerModel';
import './users-workspace.css';
export default function AccountPage() {
 const {user}=useAuth();const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{Promise.all([authApi.travellerSelections('saved'),authApi.travellerSelections('alerts')]).then(setData).catch(e=>setError(e.message));},[]);
 return <div className="uw"><SiteNav section="account"/><main><div className="uw-section-title"><div><h1>Your account</h1><p>{user.name} · Your saved flights and alert preferences.</p></div><Link className="uw-primary" to="/users/profile">Profile & settings</Link></div>{error?<p role="alert">{error}</p>:!data?<p role="status">Loading your account…</p>:<><div className="uw-stat-pair"><Link to="/users/saved"><small>Saved flights</small><b>{data[0].length}</b></Link><Link to="/users/saved"><small>Price alerts</small><b>{data[1].length}</b></Link></div><section className="uw-trend-card"><h2>Pick up where you left off</h2>{data[0].length?data[0].slice(0,5).map(s=><Link className="uw-trend-row" key={s.key} to={'/users?'+new URLSearchParams({route:s.route,date:s.date})}><strong>{s.route.replace('-',' → ')}</strong><span>{dayLabel(s.date)}</span><b>{rupees(s.total)} when saved</b></Link>):<><p>Save a flight from the results to find it here later.</p><Link className="uw-primary" to="/users">Find flights</Link></>}</section></>}</main></div>;
}
