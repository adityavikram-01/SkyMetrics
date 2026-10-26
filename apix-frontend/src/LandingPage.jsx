import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Bell, Bookmark, CalendarDays, Check, ChevronDown } from 'lucide-react'
import SiteNav from './SiteNav'
import { useAuth } from './AuthContext'
import { useLocale } from './LocaleContext'
import { api } from './api'
import indiaStates from './india-states.svg'
import './home.css'

const cities = { DEL: 'Delhi', BOM: 'Mumbai', BLR: 'Bengaluru', CCU: 'Kolkata', HYD: 'Hyderabad', PNQ: 'Pune', AMD: 'Ahmedabad', MAA: 'Chennai', PAT: 'Patna', GOI: 'Goa' }
const points = { DEL: [139.2, 147.5], BOM: [88.4, 261.1], BLR: [146.5, 331.8], CCU: [275.4, 218.3], HYD: [155.1, 283.3], PNQ: [101, 267.2], AMD: [85.5, 213.3], MAA: [176, 334.3], PAT: [235.1, 183.1], GOI: [100, 305.6] }
const featuredRoutes = ['BOM-DEL', 'DEL-GOI', 'DEL-PAT']

function RouteVisual({ route }) {
  const [from, to] = route.split('-')
  const start = points[from] || points.BOM
  const end = points[to] || points.DEL
  const dx = end[0] - start[0], dy = end[1] - start[1]
  const distance = Math.hypot(dx, dy) || 1
  const bend = Math.min(28, Math.max(12, distance * .17))
  const control = [(start[0] + end[0]) / 2 - dy / distance * bend, (start[1] + end[1]) / 2 + dx / distance * bend]
  const path = `M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}`

  return <div className="home-atlas">
    <div className="home-atlas-top"><span>SKYMETRICS / ROUTE VIEW</span><span className="home-atlas-pulse"><i /> SIMULATED</span></div>
    <div className="home-atlas-route"><div><strong>{from}</strong><span>{cities[from]}</span></div><div className="home-atlas-route-line"><span /><span /></div><div><strong>{to}</strong><span>{cities[to]}</span></div></div>
    <svg className="home-atlas-map" viewBox="0 0 420 470" role="img" aria-label={`Map preview showing ${cities[from]} to ${cities[to]}`}>
      <image href={indiaStates} x="0" y="0" width="420" height="470" />
      <path key={route} className="home-atlas-path" d={path} />
      <circle className="home-atlas-ring" cx={start[0]} cy={start[1]} r="12" />
      <circle className="home-atlas-ring home-atlas-ring-end" cx={end[0]} cy={end[1]} r="12" />
      <circle className="home-atlas-node" cx={start[0]} cy={start[1]} r="5" />
      <circle className="home-atlas-node" cx={end[0]} cy={end[1]} r="5" />
      <circle className="home-atlas-traveller" r="3.3" aria-hidden="true"><animateMotion key={route} dur="5s" repeatCount="indefinite" path={path} /></circle>
    </svg>
    <div className="home-atlas-foot"><span>INDIA DOMESTIC</span><span>{from} — {to}</span></div>
  </div>
}

function FareIllustration() {
  return <div className="home-fare-illustration" aria-hidden="true">
    <div className="home-fare-top"><span>FARE CHECK</span><span>● ● ●</span></div>
    <div className="home-fare-row"><span>Fare you found</span><div className="home-fare-track"><i /></div></div>
    <div className="home-fare-row"><span>Usual for this trip</span><div className="home-fare-track"><i /></div></div>
    <div className="home-fare-result"><Check size={14} /> See the price in context</div>
  </div>
}

function DateIllustration() {
  return <div className="home-date-illustration" aria-hidden="true"><span>NEARBY DATES</span><div>{['MON', 'TUE', 'WED', 'THU', 'FRI'].map((day, index) => <div key={day} className={index === 1 ? 'best' : ''}><small>{day}</small><b>{14 + index}</b><i /></div>)}</div><strong>Find the day that fits your budget ↗</strong></div>
}

export default function LandingPage() {
  const { user } = useAuth()
  const { t } = useLocale()
  const [routes, setRoutes] = useState([{ code: 'BOM-DEL' }])
  const [route, setRoute] = useState('BOM-DEL')
  useEffect(() => { api.routes().then(result => { setRoutes(result); setRoute(current => result.some(item => item.code === current) ? current : result[0]?.code || current) }).catch(() => {}) }, [])
  const [from, to] = useMemo(() => route.split('-'), [route])
  const origins = useMemo(() => [...new Set(routes.map(item => item.code.split('-')[0]))], [routes])
  const destinations = useMemo(() => routes.filter(item => item.code.startsWith(`${from}-`)).map(item => item.code.split('-')[1]), [routes, from])
  const chooseOrigin = origin => {
    const matchingRoutes = routes.filter(item => item.code.startsWith(`${origin}-`))
    setRoute(matchingRoutes.find(item => item.code.endsWith(`-${to}`))?.code || matchingRoutes[0]?.code || route)
  }

  const routeSearch = <section className="home-route-desk" id="route-desk" aria-labelledby="route-desk-title">
    <div className="home-desk-heading"><div><span>{t('start')}</span><h2 id="route-desk-title">{t('where')}</h2></div><p>{t('choose')}</p></div>
    <div className="home-desk-controls">
      <label className="home-route-select" htmlFor="home-origin"><span>{t('from')}</span><strong>{cities[from] || from} <small>{from}</small></strong><select id="home-origin" value={from} onChange={event => chooseOrigin(event.target.value)}>{origins.map(origin => <option key={origin} value={origin}>{cities[origin] || origin}</option>)}</select><ChevronDown size={19} /></label>
      <label className="home-route-select" htmlFor="home-destination"><span>{t('to')}</span><strong>{cities[to] || to} <small>{to}</small></strong><select id="home-destination" value={to} onChange={event => setRoute(`${from}-${event.target.value}`)}>{destinations.map(destination => <option key={destination} value={destination}>{cities[destination] || destination}</option>)}</select><ChevronDown size={19} /></label>
      <Link to={`/flights?route=${route}`} className="home-search-button">{t('check')} <ArrowUpRight size={20} /></Link>
    </div>
    <div className="home-desk-bottom"><span>{t('quick')}</span><div>{featuredRoutes.filter(code => routes.some(item => item.code === code)).map(code => { const [origin, destination] = code.split('-'); return <button type="button" key={code} className={route === code ? 'active' : ''} onClick={() => setRoute(code)}>{cities[origin]} <ArrowRight size={13} /> {cities[destination]}</button> })}</div><small>{t('simulated')}</small></div>
  </section>

  return <div className="platform-page home-page"><SiteNav section="home" />
    <main className="home-main">
      <section className="home-hero">{routeSearch}<div className="home-hero-inner">
        <div className="home-hero-copy"><div className="home-kicker"><span className="home-kicker-line" /> {t('kicker')}</div><h1>{t('headline1')}<br /><em>{t('headline2')}</em></h1><p>{t('heroText')}</p><div className="home-hero-actions"><a className="home-primary-link" href="#route-desk">{t('explore')} <ArrowUpRight size={19} /></a><a className="home-secondary-link" href="#why-skymetrics">{t('how')} <ArrowRight size={16} /></a></div></div>
        <RouteVisual route={route} />
      </div></section>

      <section className="home-story" id="why-skymetrics"><div className="home-story-heading"><span className="home-section-kicker">{t('way')}</span><h2>{t('story1')}<br /><em>{t('story2')}</em></h2><p>{t('storyText')}</p></div><div className="home-feature-grid">
        <Link to="/flights" className="home-feature home-feature-fare"><div className="home-feature-copy"><span>01 / {t('context')}</span><h3>{t('contextTitle')}</h3><p>{t('contextText')}</p><b>{t('contextAction')} <ArrowUpRight size={17} /></b></div><FareIllustration /></Link>
        <Link to="/insights" className="home-feature home-feature-dates"><div className="home-feature-copy"><span>02 / {t('dates')}</span><h3>{t('datesTitle')}</h3><p>{t('datesText')}</p><b>{t('datesAction')} <ArrowUpRight size={17} /></b></div><DateIllustration /></Link>
        <Link to="/account" className="home-feature home-feature-watch"><div className="home-feature-copy"><span>03 / {t('trips')}</span><h3>{t('tripsTitle')}</h3><p>{t('tripsText')}</p><b>{t('tripsAction')} <ArrowUpRight size={17} /></b></div><div className="home-watch-visual" aria-hidden="true"><div className="home-watch-orbit"><Bell size={28} /></div><span><Bookmark size={15} /> SAVED ROUTE</span></div></Link>
      </div></section>

      <section className="home-last-word"><div><span>{t('closingLabel')}</span><h2>{t('closing')}</h2></div><Link to={user ? '/account' : '/login?next=%2Fflights'}>{user ? t('tripsAction') : t('getStarted')} <ArrowUpRight size={19} /></Link></section>
      <div className="home-data-note"><CalendarDays size={16} /><span>{t('dataNote')}</span></div>
    </main><footer className="platform-footer">SkyMetrics · Airfare intelligence prototype</footer>
  </div>
}
