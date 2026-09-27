async function read(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || body.error || `Request failed (${response.status})`)
  return body
}

async function send(path, method = 'GET', body) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = await read(await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' }))
    headers[csrf.headerName] = csrf.token
  }
  return read(await fetch(path, {
    method, headers, credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body)
  }))
}

export const authApi = {
  csrf: () => send('/api/v1/auth/csrf'),
  session: () => send('/api/v1/auth/me'),
  login: body => send('/api/v1/auth/login', 'POST', body),
  workspaceLogin: (workspace, body) => send(`/api/v1/auth/${encodeURIComponent(workspace)}/login`, 'POST', body),
  register: body => send('/api/v1/auth/register', 'POST', body),
  logout: () => send('/api/v1/auth/logout', 'POST'),
  dashboard: () => send('/api/v1/me/dashboard'),
  profile: () => send('/api/v1/me/profile'),
  updateProfile: body => send('/api/v1/me/profile', 'PUT', body),
  updatePassword: body => send('/api/v1/me/password', 'PUT', body),
  trips: () => send('/api/v1/me/trips'),
  saveTrip: body => send('/api/v1/me/trips', 'POST', body),
  removeTrip: id => send(`/api/v1/me/trips/${encodeURIComponent(id)}`, 'DELETE'),
  watchlist: () => send('/api/v1/me/watchlist'),
  watch: route => send('/api/v1/me/watchlist', 'POST', { route }),
  unwatch: id => send(`/api/v1/me/watchlist/${encodeURIComponent(id)}`, 'DELETE'),
  searches: () => send('/api/v1/me/searches'),
  recordSearch: (route, departureDate) => send('/api/v1/me/searches', 'POST', { route, departureDate }),
  alerts: () => send('/api/v1/me/alerts'),
  createAlert: body => send('/api/v1/me/alerts', 'POST', body),
  removeAlert: id => send(`/api/v1/me/alerts/${encodeURIComponent(id)}`, 'DELETE'),
  notifications: () => send('/api/v1/me/notifications'),
  preferences: body => send('/api/v1/me/preferences', 'PUT', body),
  policy: () => send('/api/v1/indices/airfare/government?datasetId=1c5579eb-56b1-5b47-8dd8-18f807fe9e4c&asOf=2026-09-13'),
  partner: () => send('/api/v1/partner/overview'),
  operations: () => send('/api/v1/ops/overview'),
  users: () => send('/api/v1/ops/users'),
  provisionUser: body => send('/api/v1/ops/users', 'POST', body),
  changeRole: (id,role) => send(`/api/v1/ops/users/${encodeURIComponent(id)}/role`, 'PUT', {role}),
  datasets: () => send('/api/v1/ops/datasets'),
  collectionRuns: () => send('/api/v1/ops/collection-runs'),
  evaluateAlerts: datasetId => send(`/api/v1/ops/alerts/evaluate?datasetId=${encodeURIComponent(datasetId)}&asOf=2026-09-13`, 'POST')
}
