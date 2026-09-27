import { useEffect, useState } from 'react'
import { AreaLayout } from './AreaLayout'
import { authApi } from './authApi'
import { DATASET_ID } from './api'

const startForm = { name:'', email:'', role:'GOV_ANALYST', temporaryPassword:'' }
const roles = [['TRAVELLER','Traveller'],['GOV_ANALYST','Government analyst'],['PARTNER','Data partner'],['ADMIN','Administrator']]

export default function AdminPortal() {
  const [overview,setOverview] = useState(null)
  const [datasets,setDatasets] = useState([])
  const [runs,setRuns] = useState([])
  const [users,setUsers] = useState([])
  const [notice,setNotice] = useState('')
  const [form,setForm] = useState(startForm)
  const load = async () => {
    try {
      const [summary,sets,collections,accounts] = await Promise.all([authApi.operations(),authApi.datasets(),authApi.collectionRuns(),authApi.users()])
      setOverview(summary);setDatasets(sets);setRuns(collections);setUsers(accounts)
    } catch(cause) { setNotice(cause.message) }
  }
  useEffect(()=>{load()},[])
  const provision = async event => {
    event.preventDefault()
    try { await authApi.provisionUser(form);setForm(startForm);setNotice('Account created. Share its sign-in details privately.');await load() }
    catch(cause) { setNotice(cause.message) }
  }
  const changeRole = async (id,role) => {
    if(role==='ADMIN' && !window.confirm('Grant full administrator access to this account?')) return
    try { await authApi.changeRole(id,role);setNotice('Role updated. Access changes apply to the user immediately.');await load() }
    catch(cause) { setNotice(cause.message) }
  }
  const evaluate = async () => {
    try { const result=await authApi.evaluateAlerts(DATASET_ID);setNotice(`${result.createdNotifications} in-app notifications created.`) }
    catch(cause) { setNotice(cause.message) }
  }
  return <AreaLayout section="admin" eyebrow="OWNER / ADMIN" title="Platform operations" description="Manage access, inspect the dataset, and run the in-app alert check.">
    <div className="platform-account-summary">
      <div><strong>{overview?.routes??'—'}</strong><span>Routes</span></div>
      <div><strong>{overview?.airlines??'—'}</strong><span>Airlines</span></div>
      <div><strong>{overview?.accounts??'—'}</strong><span>Accounts</span></div>
      <div><strong>{overview?.fareObservationsEstimate?.toLocaleString('en-IN')??'—'}</strong><span>Fare records, estimated</span></div>
    </div>
    {notice&&<p className="platform-error" role="status">{notice}</p>}
    <div className="platform-content-grid">
      <section className="platform-card"><h2>Issue specialist credentials</h2><p className="platform-muted">Create Government analyst or Developer partner access here. Public signup remains for travellers only. Administrator roles are managed by the platform owner.</p>
        <form className="platform-admin-form" onSubmit={provision}>
          <label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
          <label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="GOV_ANALYST">Government analyst</option><option value="PARTNER">Data partner</option></select></label>
          <label>Temporary password<input required minLength={16} type="password" value={form.temporaryPassword} onChange={e=>setForm({...form,temporaryPassword:e.target.value})}/></label>
          <button className="platform-button">Create account</button>
        </form>
      </section>
      <section className="platform-card"><h2>Data operations</h2>
        <p><strong>Mode:</strong> {overview?.dataMode||'Loading…'}</p><p><strong>Account email:</strong> {overview?.accountEmailConfigured ? 'Configured' : 'Needs SMTP setup'}</p><p><strong>Datasets:</strong> {overview?.datasets??'—'}</p><p><strong>Collection runs:</strong> {overview?.collectionRuns??'—'}</p><p><strong>Last collection:</strong> {overview?.lastCollectionDate||'—'}</p><p className="platform-muted">{overview?.countNote}</p>
        <button className="platform-button" onClick={evaluate}>Evaluate price alerts</button>
        <h3>Recent runs</h3>{runs.slice(0,5).map((run,i)=><div className="platform-list-row" key={i}><div><strong>{run.collectionDate}</strong><small>{run.resultCount?.toLocaleString('en-IN')} results</small></div></div>)}
        <h3>Datasets</h3>{datasets.map((dataset,i)=><div className="platform-list-row" key={i}><div><strong>{dataset.modelVersion}</strong><small>{dataset.simulated?'Simulated dataset':'Imported dataset'}</small></div></div>)}
      </section>
    </div>
    <section className="platform-card platform-users"><h2>Account access</h2><p className="platform-muted">Only the platform owner can assign roles. Public signups are travellers; users cannot request administrator access. Access changes apply immediately.</p>
      {users.map(account=><div className="platform-list-row" key={account.id}><div><strong>{account.name} · {account.email}</strong><small>{account.role.replace('_',' ')}</small></div>{account.email===overview?.ownerEmail ? <span className="platform-owner-label">Owner</span> : overview?.owner ? <select aria-label={`Role for ${account.email}`} value={account.role} onChange={e=>changeRole(account.id,e.target.value)}>{roles.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select> : <span className="platform-owner-label">Managed by owner</span>}</div>)}
    </section>
  </AreaLayout>
}
