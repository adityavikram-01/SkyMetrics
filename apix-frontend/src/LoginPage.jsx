import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, Eye, EyeOff, LockKeyhole, X } from 'lucide-react'
import BrandMark from './BrandMark'
import LoadingScreen from './LoadingScreen'
import { useAuth } from './AuthContext'
import './auth.css'

const destinations = {
  '/flights': ['Check your fare with SkyMetrics.', 'Sign in or create an account to compare fares and save the trips you care about.'],
  '/insights': ['See more of your route.', 'Sign in or create an account to explore dates, airlines and fare patterns.'],
  '/market': ['Follow the fare trends.', 'Sign in or create an account to see how covered routes are changing.'],
  '/account': ['Keep your trips close.', 'Save trips, follow routes and manage fare alerts in your own space.'],
  '/profile': ['Your SkyMetrics account.', 'Sign in to manage your profile and travel preferences.'],
  '/policy': ['Continue to the policy workspace.', 'Sign in with an approved analyst account to view the airfare index.'],
  '/government': ['Government workspace.', 'Sign in with an approved Government analyst or administrator account.'],
  '/developer': ['Developer workspace.', 'Sign in with an approved partner or administrator account.'],
  '/users': ['Check your fare with SkyMetrics.', 'Sign in to compare fares and save the trips you care about.'],
  '/developers': ['Continue to the data workspace.', 'Sign in with an approved partner account to explore the API.'],
  '/admin': ['Continue to operations.', 'Sign in with your SkyMetrics administrator account.'],
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requested = params.get('next')
  const next = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/account'
  const returnPath = '/'
  const [headline, description] = destinations[next.split(/[?#]/)[0]] || ['Make every trip yours.', 'Sign in to save fares, watch routes and keep your plans in one place.']
  const [signup, setSignup] = useState(params.get('mode') === 'signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [transitionLabel, setTransitionLabel] = useState('')

  const submit = async event => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const creating = signup
      const user = creating ? await register({ name, email, password }) : await login({ email, password })
      setTransitionLabel(creating ? 'Setting up your account' : 'Opening your account')
      await new Promise(resolve => setTimeout(resolve, 1000))
      navigate(requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/users/account', { replace:true })
    } catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }

  if (next.startsWith('/government') || next.startsWith('/policy')) return <Navigate to={`/government/login?next=${encodeURIComponent(next)}`} replace/>
  if (next.startsWith('/developer')) return <Navigate to={`/developer/login?next=${encodeURIComponent(next)}`} replace/>
  if (next.startsWith('/admin')) return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace/>
  if (transitionLabel) return <LoadingScreen label={transitionLabel}/>

  return <div className="auth-page">
    <div className="auth-underlay" aria-hidden="true"><div className="auth-underlay-brand"><BrandMark className="brand-mark"/><strong>Sky<span>Metrics</span></strong></div><span>FARES, IN CONTEXT</span><h1>Go where you want.<br/><em>Know what to pay.</em></h1></div>
    <div className="auth-shade"/>
    <main className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description">
      <Link className="auth-close" to={returnPath} aria-label="Close sign in"><X size={21}/></Link>
      <div className="auth-form-side">
        <div className="auth-brand"><BrandMark className="brand-mark"/><span>Sky<strong>Metrics</strong></span></div>
        <span className="auth-kicker">YOUR ACCOUNT</span>
        <h2 id="auth-title">{signup ? 'Create your account.' : headline}</h2>
        <p id="auth-description">{signup ? 'Start saving trips and following the routes you care about.' : description}</p>
        <div className="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" aria-selected={!signup} className={!signup?'active':''} onClick={()=>{setSignup(false);setError('')}}>Sign in</button><button type="button" role="tab" aria-selected={signup} className={signup?'active':''} onClick={()=>{setSignup(true);setError('')}}>Create account</button></div>
        <form onSubmit={submit}>
          {signup&&<label>Full name<input required maxLength={80} autoComplete="name" placeholder="Your name" value={name} onChange={event=>setName(event.target.value)}/></label>}
          <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event=>setEmail(event.target.value)}/></label>
          <label>Password<div className="auth-password"><input required type={showPassword?'text':'password'} minLength={signup?12:1} autoComplete={signup?'new-password':'current-password'} placeholder={signup?'At least 12 characters':'Enter your password'} value={password} onChange={event=>setPassword(event.target.value)}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          {signup&&<small>New accounts have traveller access. Specialist access is approved separately.</small>}
          {error&&<p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'} <ArrowRight size={18}/></button>
        </form>
        <p className="auth-foot"><LockKeyhole size={14}/> Your account keeps your saved trips and alerts together.</p>
      </div>
    </main>
  </div>
}
