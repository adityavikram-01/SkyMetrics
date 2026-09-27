import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { ChevronDown, Globe2, LogOut } from 'lucide-react'
import { useAuth } from './AuthContext'
import { languages, useLocale } from './LocaleContext'
import BrandMark from './BrandMark'
import './platform.css'
import './brand.css'
import './site-nav.css'

export default function SiteNav({ section }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const { language, setLanguage, t } = useLocale()
  const localized = section === 'home' || section === 'help'
  const label = (key, english) => localized ? t(key) : english
  const government = section === 'policy' || section === 'government'
  const developer = section === 'developer' || section === 'developers'
  const admin = section === 'admin'
  const workspace = government || developer || admin
  const links = government ? [['/government','Airfare observatory']]
    : developer ? [['/developer','API workspace']]
    : admin ? [['/admin','Operations']]
    : [['/users',label('flights','Flights')],['/users/insights',label('insights','Route insights')],['/users/trends',label('trends','Fare trends')],['/help',label('help','Help')]]
  const workspaces = user ? [['/users','Traveller'],...(user.role === 'GOV_ANALYST' || user.role === 'ADMIN' ? [['/government','Government']] : []),...(user.role === 'PARTNER' || user.role === 'ADMIN' ? [['/developer','Developer']] : []),...(user.role === 'ADMIN' ? [['/admin','Admin']] : [])] : []
  const signOut = async () => {
    setSigningOut(true)
    try { await logout(); navigate(admin?'/admin/login':government?'/government/login':'/developer/login',{replace:true}) }
    catch { window.alert('Sign out failed. Please try again.') }
    finally { setSigningOut(false) }
  }
  return <div className={`platform-nav${workspace?' platform-workspace-nav':''}`}><Link to="/" className="platform-logo" aria-label="SkyMetrics home"><BrandMark className="brand-mark"/><span className="brand-wordmark">Sky<span>Metrics</span></span></Link><nav aria-label={workspace?'Workspace navigation':'Main navigation'}>{links.map(([path,linkLabel]) => path.includes('#') ? <a key={path} href={path}>{linkLabel}</a> : <NavLink key={path} to={path} end={path === '/users'} className={({isActive}) => isActive ? 'active' : ''}>{linkLabel}</NavLink>)}</nav><div className="platform-nav-actions">{workspaces.length > 1 && <label className="platform-workspace-picker"><span className="sr-only">Switch workspace</span><select aria-label="Switch workspace" value={government?'/government':developer?'/developer':admin?'/admin':'/users'} onChange={event => { window.location.assign(event.target.value) }}>{workspaces.map(([path,name])=><option key={path} value={path}>{name}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>}{localized && <label className="platform-language"><Globe2 size={16} aria-hidden="true"/><span className="sr-only">{t('language')}</span><select value={language} onChange={event => setLanguage(event.target.value)} aria-label={t('language')}>{languages.map(item => <option key={item.code} value={item.code}>{item.native}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>}<Link to={user ? '/users/account' : '/login'} className="platform-account-link" aria-label={user ? label('dashboard','Account') : label('signIn','Sign in')}>{user ? user.name?.trim().split(' ')[0] || label('dashboard','Account') : label('signIn','Sign in')}</Link>{workspace && user && <button type="button" className="platform-signout" onClick={signOut} disabled={signingOut}><LogOut size={15}/> {signingOut?'Signing out…':'Sign out'}</button>}</div></div>
}
