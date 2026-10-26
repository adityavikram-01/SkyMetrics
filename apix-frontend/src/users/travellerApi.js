async function get(path, params, signal) {
 const response = await fetch('/api/v1/traveller/' + path + '?' + new URLSearchParams(params), { signal, credentials: 'same-origin' });
 const body = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(response.status === 401 ? 'Your session has ended. Sign in to continue.' : body.error || body.detail || 'Unable to load this information. Please try again.');
 return body;
}
export const travellerApi = {
 search: ({ route, date }, signal) => get('search', { route, ...(date ? { date } : {}) }, signal),
 trends: (days, signal) => get('trends', { days }, signal),
};
