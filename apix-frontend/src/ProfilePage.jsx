import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, LockKeyhole, LogOut, UserRound } from 'lucide-react'
import { AreaLayout } from './AreaLayout'
import { authApi } from './authApi'
import { useAuth } from './AuthContext'
import './account.css'

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth()
  const navigate = useNavigate()
  const [profile,setProfile] = useState({name:user.name,email:user.email,homeAirport:user.homeAirport||'',preferredAirline:user.preferredAirline||''})
  const [passwords,setPasswords] = useState({currentPassword:'',newPassword:''})
  const [notice,setNotice] = useState('')
  const [busy,setBusy] = useState(false)
  useEffect(()=>{authApi.profile().then(result=>setProfile({...result,homeAirport:result.homeAirport||'',preferredAirline:result.preferredAirline||''})).catch(error=>setNotice(error.message))},[])
  const saveProfile = async event => {
    event.preventDefault();setBusy(true);setNotice('')
    try { await authApi.updateProfile({name:profile.name,homeAirport:profile.homeAirport||null,preferredAirline:profile.preferredAirline||null});await refresh();setNotice('Profile saved.') }
    catch(error){setNotice(error.message)} finally{setBusy(false)}
  }
  const savePassword = async event => {
    event.preventDefault();setBusy(true);setNotice('')
    try { await authApi.updatePassword(passwords);setPasswords({currentPassword:'',newPassword:''});await refresh();navigate('/login?next=%2Fprofile',{replace:true}) }
    catch(error){setNotice(error.message)} finally{setBusy(false)}
  }
  return <AreaLayout section="account" eyebrow="YOUR ACCOUNT" title="Profile settings" description="Manage your details and how you use SkyMetrics.">
    <Link className="account-back" to="/account"><ArrowLeft size={16}/> Back to dashboard</Link>
    <div className="account-profile-head"><span className="account-avatar"><UserRound size={28}/></span><div><strong>{profile.name}</strong><small>{profile.email}</small></div><span className="account-role">{user.role === 'TRAVELLER' ? 'Traveller' : user.role.replace('_',' ')}</span></div>
    {notice&&<p className="platform-error" role="status">{notice}</p>}
    <div className="platform-content-grid account-settings">
      <section className="platform-card"><div className="platform-card-heading"><UserRound/><h2>Personal details</h2></div><form className="platform-preferences" onSubmit={saveProfile}><label>Full name<input required maxLength={120} autoComplete="name" value={profile.name} onChange={event=>setProfile({...profile,name:event.target.value})}/></label><label>Email address<input value={profile.email} readOnly aria-describedby="email-note"/></label><p id="email-note" className="platform-muted">Your email is used to sign in. Email changes are not available yet.</p><label>Home airport<input maxLength={3} placeholder="DEL" value={profile.homeAirport} onChange={event=>setProfile({...profile,homeAirport:event.target.value.toUpperCase()})}/></label><label>Preferred airline code<input maxLength={2} placeholder="6E" value={profile.preferredAirline} onChange={event=>setProfile({...profile,preferredAirline:event.target.value.toUpperCase()})}/></label><button disabled={busy}>Save changes</button></form></section>
      <section className="platform-card"><div className="platform-card-heading"><LockKeyhole/><h2>Security</h2></div><form className="platform-preferences" onSubmit={savePassword}><label>Current password<input type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event=>setPasswords({...passwords,currentPassword:event.target.value})}/></label><label>New password<input type="password" autoComplete="new-password" required minLength={12} value={passwords.newPassword} onChange={event=>setPasswords({...passwords,newPassword:event.target.value})}/></label><p className="platform-muted">Use at least 12 characters.</p><button disabled={busy}>Change password</button></form><button className="account-signout" onClick={async()=>{await logout();navigate('/')}}><LogOut size={16}/> Sign out</button></section>
    </div>
  </AreaLayout>
}
