import { Link, Navigate, useLocation } from 'react-router'
import SiteNav from './SiteNav'
import { useAuth } from './AuthContext'
import LoadingScreen from './LoadingScreen'

export function AreaLayout({ section, eyebrow, title, description, children }) {
  return <div className={`platform-page platform-${section}`}><SiteNav section={section}/><main className="platform-main"><div className="platform-intro"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</main><footer className="platform-footer">SkyMetrics · Simulated airfare dataset · Prototype analysis</footer></div>
}

export function RequireRole({ roles, children, section, title }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen label="Checking your access"/>
  if (!user) {
    const signIn = section === 'policy' ? '/government/login' : section === 'developers' ? '/developer/login' : section === 'admin' ? '/admin/login' : '/login'
    return <Navigate to={`${signIn}?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace/>
  }
  if (!roles.includes(user.role)) return <AreaLayout section={section} eyebrow="ACCESS LIMITED" title={title} description="Your account is active, but this workspace needs a different role."><div className="platform-gate"><h2>Access is managed by SkyMetrics</h2><p>Your role is {user.role.replace('_',' ').toLowerCase()}. An administrator must approve access to this workspace.</p><Link to="/flights" className="platform-button">Open Flights</Link></div></AreaLayout>
  return children
}
