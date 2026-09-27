import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, Eye, EyeOff, Landmark, LockKeyhole, Code2, ShieldCheck } from 'lucide-react'
import BrandMark from './BrandMark'
import LoadingScreen from './LoadingScreen'
import { useAuth } from './AuthContext'
import './workspace-login.css'

const workspaces = {
  government: { title:'Airfare policy desk', eyebrow:'GOVERNMENT ACCESS', copy:'A focused research space for the simulated airfare index, route movement and methodology.', icon:Landmark, roles:['GOV_ANALYST','ADMIN'], destination:'/government', hint:'Issued to approved analysts', note:'Need access? Contact your SkyMetrics administrator.', action:'Open policy desk' },
  developer: { title:'Build with the data', eyebrow:'DEVELOPER ACCESS', copy:'Your integration workspace for documented endpoints, test responses and data coverage.', icon:Code2, roles:['PARTNER','ADMIN'], destination:'/developer', hint:'Issued to approved data partners', note:'Partner access is assigned by a SkyMetrics administrator.', action:'Open developer console' },
  admin: { title:'Platform control', eyebrow:'ADMINISTRATOR ACCESS', copy:'Manage access to specialist workspaces and monitor platform operations.', icon:ShieldCheck, roles:['ADMIN'], destination:'/admin', hint:'Administrator account only', note:'There is no public administrator registration.', action:'Open operations' },
}

function WorkspacePreview({ type }) {
  if (type === 'government') return <div className="workspace-preview workspace-preview-government"><span>INDIA AIRFARE INDEX <small>SIMULATED</small></span><strong>114.9</strong><p>Illustrative basket · base 100</p><div className="workspace-preview-bars">{[38,49,45,61,55,72,66,81,91].map((height,index)=><i key={index} style={{height:`${height}%`}}/>)}</div></div>
  if (type === 'developer') return <div className="workspace-preview workspace-preview-developer"><span><i/> API RESPONSE PREVIEW</span><code><b>GET</b> /api/v1/routes/DEL-BOM/statistics</code><pre>{'{\n  "route": "DEL-BOM",\n  "dataMode": "SIMULATED",\n  "status": "ready"\n}'}</pre></div>
  return <div className="workspace-preview workspace-preview-admin"><span>ACCESS CONTROL</span><div><i/><strong>Travellers</strong><small>Public signup</small></div><div><i/><strong>Analysts & partners</strong><small>Admin issued</small></div><div><i/><strong>Administrators</strong><small>Owner assigned</small></div></div>
}

export default function WorkspaceLogin({ type }) {
  const config = workspaces[type]
  const { user, loading, loginWorkspace } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const next = params.get('next')
  const destination = next?.startsWith(config.destination) && !next.startsWith('//') ? next : config.destination
  const Icon = config.icon

  if (loading) return <LoadingScreen label="Checking your access"/>
  if (user && config.roles.includes(user.role)) return <Navigate to={destination} replace/>

  const submit = async event => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await loginWorkspace(type,{email,password})
      navigate(destination,{replace:true})
    } catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }

  return <div className={`workspace-login workspace-login-${type}`}>
    <header><Link to="/" className="workspace-login-brand"><BrandMark className="brand-mark"/><span>Sky<strong>Metrics</strong></span></Link><Link to="/">Back to SkyMetrics</Link></header>
    <main className="workspace-login-main"><div className="workspace-login-story"><span className="workspace-login-eyebrow"><Icon size={17}/> {config.eyebrow}</span><h1>{config.title}</h1><p>{config.copy}</p><WorkspacePreview type={type}/><span className="workspace-login-access"><LockKeyhole size={17}/> {config.hint}</span></div>
      <section className="workspace-login-card" aria-labelledby="workspace-login-heading"><div className="workspace-login-card-icon"><Icon size={23}/></div><span>{config.eyebrow}</span><h2 id="workspace-login-heading">Sign in to continue</h2><p>Use the credentials assigned for this workspace.</p><form onSubmit={submit}><label>Work email<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="name@organisation.in"/></label><label>Password<div className="workspace-login-password"><input type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} placeholder="Your password"/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>{error&&<p className="workspace-login-error" role="alert">{error}</p>}<button className="workspace-login-submit" disabled={busy}>{busy?'Signing in…':config.action} <ArrowRight size={18}/></button></form><small>{config.note}</small></section>
    </main>
    <footer>SkyMetrics research prototype · Simulated airfare data</footer>
  </div>
}
