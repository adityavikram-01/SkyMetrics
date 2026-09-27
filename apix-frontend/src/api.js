export const DATASET_ID = '1c5579eb-56b1-5b47-8dd8-18f807fe9e4c'
export const AS_OF = '2026-09-13'

async function request(path) {
  const response = await fetch(path)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.message || body?.error || `Request failed (${response.status})`)
  return body
}

const q = params => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))

export const api = {
  health: () => request('/api/v1/health'),
  routes: () => request('/api/v1/catalog/routes'),
  airlines: () => request('/api/v1/catalog/airlines'),
  search: (route, departureDate, asOf = AS_OF) => request(`/api/v1/fares/search?${q({ datasetId: DATASET_ID, route, departureDate, asOf, page: 0, size: 8 })}`),
  intelligence: (origin, destination, departureDate, asOf = AS_OF) => request(`/api/v1/intelligence/${origin}/${destination}?${q({ datasetId: DATASET_ID, departureDate, asOf })}`),
  calendar: (route, asOf = AS_OF) => request(`/api/v1/fares/calendar?${q({ datasetId: DATASET_ID, route, asOf })}`),
  statistics: (route, asOf = AS_OF) => request(`/api/v1/routes/${route}/statistics?${q({ datasetId: DATASET_ID, route, asOf, days: 90 })}`),
  booking: (route, asOf = AS_OF) => request(`/api/v1/routes/${route}/booking-window?${q({ datasetId: DATASET_ID, route, asOf })}`),
  airlinesCompare: (route, asOf = AS_OF) => request(`/api/v1/airlines/compare?${q({ datasetId: DATASET_ID, route, asOf, days: 90 })}`),
  volatility: (route, asOf = AS_OF) => request(`/api/v1/routes/${route}/volatility?${q({ datasetId: DATASET_ID, route, asOf, days: 90 })}`),
  index: (asOf = AS_OF, city) => request(`/api/v1/indices/airfare?${q({ datasetId: DATASET_ID, asOf, city })}`),
  governmentIndex: (asOf) => request(`/api/v1/indices/airfare/government?${q({ datasetId: DATASET_ID, asOf })}`),
  heatmap: (asOf = AS_OF, lagDays = 30) => request(`/api/v1/analytics/heatmap?${q({ datasetId: DATASET_ID, asOf, lagDays })}`),
  anomalies: (route, asOf = AS_OF) => request(`/api/v1/analytics/anomalies?${q({ datasetId: DATASET_ID, route, asOf })}`),
  prediction: (origin, destination, departureDate, asOf = AS_OF) => request(`/api/v1/prediction/${origin}/${destination}?${q({ datasetId: DATASET_ID, departureDate, asOf })}`),
}
