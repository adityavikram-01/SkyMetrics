export const DATASET_ID = '71a9996b-03f0-5fc7-a98d-08966d55e58a'
export const AS_OF = '2026-10-05'

async function request(path) {
  const response = await fetch(path)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.message || body?.error || `Request failed (${response.status})`)
  return body
}

const q = params => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))

export const api = {
  history: (flightId, asOf = AS_OF) => request(`/api/v1/departures/${encodeURIComponent(flightId)}/history?${q({ datasetId: DATASET_ID, asOf })}`),
  health: () => request('/api/v1/health'),
  routes: () => request('/api/v1/catalog/routes'),
  airlines: () => request('/api/v1/catalog/airlines'),
  search: (route, departureDate, asOf = AS_OF) => request(`/api/v1/fares/search?${q({ datasetId: DATASET_ID, route, departureDate, asOf, page: 0, size: 100 })}`),
  intelligence: (origin, destination, departureDate, asOf = AS_OF) => request(`/api/v1/intelligence/${origin}/${destination}?${q({ datasetId: DATASET_ID, departureDate, asOf })}`),
  calendar: (route, asOf = AS_OF) => request(`/api/v1/fares/calendar?${q({ datasetId: DATASET_ID, route, asOf })}`),
  statistics: (route, asOf = AS_OF) => request(`/api/v1/routes/${route}/statistics?${q({ datasetId: DATASET_ID, route, asOf, days: 90 })}`),
  booking: (route, asOf = AS_OF) => request(`/api/v1/routes/${route}/booking-window?${q({ datasetId: DATASET_ID, route, asOf })}`),
  airlinesCompare: (route, asOf = AS_OF) => request(`/api/v1/airlines/compare?${q({ datasetId: DATASET_ID, route, asOf, days: 90 })}`),
  volatility: (route, asOf = AS_OF) => request(`/api/v1/routes/${route}/volatility?${q({ datasetId: DATASET_ID, route, asOf, days: 90 })}`),
  index: (asOf = AS_OF, city) => request(`/api/v1/indices/airfare?${q({ datasetId: DATASET_ID, asOf, city })}`),
  governmentResearch: (asOf) => request(`/api/v1/government/research?${q({ asOf })}`),
  governmentComparison: (asOf, compareTo) => request(`/api/v1/government/research/comparison?${q({ asOf, compareTo })}`),
  governmentRoute: (route, asOf) => request(`/api/v1/government/research/routes/${encodeURIComponent(route)}?${q({ asOf })}`),
  governmentIndex: (asOf) => request(`/api/v1/indices/airfare/government?${q({ datasetId: DATASET_ID, asOf })}`),
  heatmap: (asOf = AS_OF, lagDays = 30) => request(`/api/v1/analytics/heatmap?${q({ datasetId: DATASET_ID, asOf, lagDays })}`),
  anomalies: (route, asOf = AS_OF) => request(`/api/v1/analytics/anomalies?${q({ datasetId: DATASET_ID, route, asOf })}`),
  prediction: (origin, destination, departureDate, asOf = AS_OF) => request(`/api/v1/prediction/${origin}/${destination}?${q({ datasetId: DATASET_ID, departureDate, asOf })}`),
}
