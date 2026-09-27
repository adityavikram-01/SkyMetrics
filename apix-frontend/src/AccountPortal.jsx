import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Bell, Bookmark, Heart, History, Plus, Trash2, UserRound } from 'lucide-react'
import { AreaLayout } from './AreaLayout'
import { authApi } from './authApi'
import { useAuth } from './AuthContext'
import LoadingScreen from './LoadingScreen'
import { DATASET_ID } from './api'
import './account.css'

const money = value => value == null || value === '' ? '—' : `₹${Number(value).toLocaleString('en-IN')}`
const routeName = route => route?.replace('-', ' → ') || '—'

export default function AccountPortal() {
  const { user } = useAuth()
  const [data,setData] = useState({trips:[],watchlist:[],searches:[],alerts:[],notifications:[],dashboard:null})
  const [busy,setBusy] = useState(true)
  const [pending,setPending] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [threshold,setThreshold] = useState('')
  const [selectedTripId,setSelectedTripId] = useState('')
  const refreshData = async () => {
    try {
      const [dashboard,trips,watchlist,searches,alerts,notifications] = await Promise.all([authApi.dashboard(),authApi.trips(),authApi.watchlist(),authApi.searches(),authApi.alerts(),authApi.notifications()])
      setData({dashboard,trips,watchlist,searches,alerts,notifications});setError('')
    } catch(cause) { setError(cause.message) } finally { setBusy(false) }
  }
  useEffect(()=>{refreshData()},[])
  const act = async (fn,success) => {
    setPending(true);setError('');setNotice('')
    try { await fn();await refreshData();setNotice(success) }
    catch(cause) { setError(cause.message) } finally { setPending(false) }
  }
  const createAlert = async event => {
    event.preventDefault()
    const trip = data.trips.find(item=>String(item.id)===selectedTripId) || data.trips[0]
    if(!trip || Number(threshold)<=0) { setError('Choose a saved trip and enter a target fare above ₹0.');return }
    await act(()=>authApi.createAlert({datasetId:DATASET_ID,route:trip.route,departureDate:trip.departureDate,threshold:Number(threshold)}),'Price alert created.')
    setThreshold('')
  }
  const nextTrip=data.trips[0]
  if (busy && !error && !data.dashboard) return <LoadingScreen label="Loading your account"/>
  return <AreaLayout section="account" eyebrow="YOUR SPACE" title={`Welcome back, ${user.name.split(' ')[0]}.`} description="Your trips, watched routes and fare alerts, all in one place.">
    <section className="account-hero"><div><span className="account-eyebrow">YOUR NEXT TRIP</span><h2>{nextTrip ? routeName(nextTrip.route) : 'Where to next?'}</h2><p>{nextTrip ? `Departure ${nextTrip.departureDate} · Fare when saved ${money(nextTrip.savedFare)}` : 'Start with a route to see whether the fare looks good.'}</p><Link to={nextTrip ? `/flights?route=${nextTrip.route}&date=${nextTrip.departureDate}` : '/flights'}>{nextTrip ? 'Check this fare' : 'Explore flights'} <ArrowRight size={17}/></Link></div><div className="account-hero-side"><span className="account-avatar"><UserRound size={28}/></span><strong>{user.name}</strong><small>{user.email}</small><Link to="/profile">View profile & settings <ArrowRight size={14}/></Link></div></section>
    <div className="account-shortcuts" aria-label="Explore SkyMetrics"><Link to="/flights"><Bookmark size={20}/><strong>Check a flight</strong><span>See how a fare compares</span><ArrowRight size={16}/></Link><Link to="/insights"><Heart size={20}/><strong>Route insights</strong><span>Dates, airlines and patterns</span><ArrowRight size={16}/></Link><Link to="/market"><History size={20}/><strong>Fare trends</strong><span>Routes rising and falling</span><ArrowRight size={16}/></Link></div>
    <div className="platform-account-summary"><div><strong>{data.dashboard?.savedTrips??'—'}</strong><span>Saved trips</span></div><div><strong>{data.dashboard?.watchedRoutes??'—'}</strong><span>Watched routes</span></div><div><strong>{data.dashboard?.activeAlerts??'—'}</strong><span>Active alerts</span></div><div><strong>{data.dashboard?.recentSearches??'—'}</strong><span>Recent searches</span></div></div>
    {busy&&<p className="platform-muted" role="status">Loading your account…</p>}{error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="account-success" role="status">{notice}</p>}
    <div className="platform-content-grid account-grid">
      <section className="platform-card"><div className="platform-card-heading"><Bookmark/><h2>Saved trips</h2></div>{data.trips.length ? data.trips.map(trip=><div className="platform-list-row" key={trip.id}><div><strong>{routeName(trip.route)}</strong><small>{trip.departureDate} · Saved at {money(trip.savedFare)}</small></div><Link to={`/flights?route=${trip.route}&date=${trip.departureDate}`}>View</Link><button disabled={pending} title="Remove trip" aria-label={`Remove ${routeName(trip.route)} trip`} onClick={()=>act(()=>authApi.removeTrip(trip.id),'Trip removed.')}><Trash2 size={16}/></button></div>) : <div className="account-empty"><p>Keep a flight here so you can check it later.</p><Link to="/flights">Find a flight <ArrowRight size={14}/></Link></div>}</section>
      <section className="platform-card"><div className="platform-card-heading"><Heart/><h2>Watched routes</h2></div>{data.watchlist.length ? data.watchlist.map(item=><div className="platform-list-row" key={item.id}><div><strong>{routeName(item.route)}</strong><small>On your watchlist</small></div><Link to={`/insights?route=${item.route}`}>Explore</Link><button disabled={pending} title="Remove route" aria-label={`Remove ${routeName(item.route)} route`} onClick={()=>act(()=>authApi.unwatch(item.id),'Route removed from watchlist.')}><Trash2 size={16}/></button></div>) : <div className="account-empty"><p>Follow a route to keep it in easy reach.</p><Link to="/insights">Explore routes <ArrowRight size={14}/></Link></div>}</section>
      <section className="platform-card"><div className="platform-card-heading"><Bell/><h2>Price alerts</h2></div><p className="platform-muted">Alerts appear here when a saved fare meets your target. Delivery is currently in-app.</p>{data.trips.length>0&&<form className="platform-alert-form" onSubmit={createAlert}><select value={selectedTripId} onChange={event=>setSelectedTripId(event.target.value)} aria-label="Trip for price alert"><option value="">{routeName(data.trips[0].route)} · {data.trips[0].departureDate}</option>{data.trips.map(trip=><option key={trip.id} value={trip.id}>{routeName(trip.route)} · {trip.departureDate}</option>)}</select><input type="number" min="1" required placeholder="Target ₹" value={threshold} onChange={event=>setThreshold(event.target.value)} aria-label="Target fare"/><button disabled={pending}><Plus size={15}/> Add</button></form>}{!data.trips.length&&<p className="platform-muted">Save a trip first to create an alert.</p>}{data.alerts.filter(item=>item.active).map(item=><div className="platform-list-row" key={item.id}><div><strong>{routeName(item.route)} · {money(item.threshold)}</strong><small>{item.departureDate} · Active</small></div><button disabled={pending} title="Remove alert" aria-label={`Remove ${routeName(item.route)} alert`} onClick={()=>act(()=>authApi.removeAlert(item.id),'Alert removed.')}><Trash2 size={16}/></button></div>)}</section>
      <section className="platform-card"><div className="platform-card-heading"><History/><h2>Recently viewed</h2></div>{data.searches.length ? data.searches.slice(0,5).map(item=><div className="platform-list-row" key={item.id}><div><strong>{routeName(item.route)}</strong><small>{item.departureDate}</small></div><Link to={`/flights?route=${item.route}&date=${item.departureDate}`}>Open</Link></div>) : <p className="platform-muted">Flights you check will appear here.</p>}</section>
      <section className="platform-card account-notifications"><div className="platform-card-heading"><Bell/><h2>Notifications</h2></div>{data.notifications.length ? data.notifications.map(item=><div className="platform-list-row" key={item.id}><div><strong>{routeName(item.route)} reached {money(item.amount)}</strong><small>{item.observedAt}</small></div></div>) : <p className="platform-muted">No price alerts have triggered yet.</p>}</section>
    </div>
  </AreaLayout>
}
