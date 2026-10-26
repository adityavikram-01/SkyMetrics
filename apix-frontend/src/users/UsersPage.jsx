import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import UsersWorkspace from './UsersWorkspace';
import SiteNav from '../SiteNav';
import { travellerApi } from './travellerApi';
import { authApi } from '../authApi';
import './users-workspace.css';

export default function UsersPage({ view = 'flights' }) {
 const location = useLocation();
 const params = new URLSearchParams(location.search);
 const [selection, select] = useState({ route: params.get('route') || 'BOM-DEL', date: params.get('date') || '' });
 const [data, setData] = useState(null);
 const [account, setAccount] = useState(null);
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(true);
 const [retry, setRetry] = useState(0);
 const onSelection = useCallback((route, date) => select(old => old.route === route && old.date === date ? old : { route, date }), []);
 useEffect(() => {
  const q = new URLSearchParams(location.search);
  select({ route:q.get('route') || 'BOM-DEL', date:q.get('date') || '' });
 }, [location.search]);
 useEffect(() => {
  const controller = new AbortController();setBusy(true);setError('');
  Promise.all([
   travellerApi.search(selection, controller.signal),
   account ? Promise.resolve(account) : Promise.all([authApi.travellerSelections('saved'),authApi.travellerSelections('alerts')])
  ]).then(([payload, personal]) => {if(!controller.signal.aborted){setData(payload);setAccount(personal);setBusy(false);}})
   .catch(e => {if(!controller.signal.aborted){setError(e.message);setBusy(false);}});
  return () => controller.abort();
 }, [selection.route,selection.date,retry]);
 if(!data || error) return <div className="uw"><SiteNav section="flights"/><main><section className="uw-empty" role={error?'alert':'status'}><h2>{error?'Flights could not be loaded':'Loading flight options…'}</h2><p>{error || 'Checking the simulated dataset.'}</p>{error && <><button className="uw-primary" onClick={()=>setRetry(n=>n+1)}>Try again</button><Link to="/login?next=/users">Sign in</Link></>}</section></main></div>;
 return <><div inert={busy || undefined} aria-busy={busy}><UsersWorkspace data={data} view={view} onSelection={onSelection} initialSaved={account[0]} initialAlerts={account[1]}/></div>{busy && <div className="uw-loading-status" role="status">Updating flight options…</div>}</>;
}
