# API contract overview

All analytics endpoints require `datasetId`. Optional `asOf` allows reproducible historical queries and may not exceed the dataset's latest collection date.

| Method | Endpoint | Calculation |
|---|---|---|
| Search | `GET /api/v1/fares/search` | Latest/as-of daily offers with route, airline and departure filters; availability outcomes remain separate. |
| Price intelligence | `GET /api/v1/intelligence/{origin}/{destination}` | Current minimum versus completed departures having the same route, optional airline, month, weekday and horizon ±3. |
| Quote evaluation | `POST /api/v1/fares/evaluate` | Applies the price-intelligence comparison to a fare entered by the user. |
| Price history | `GET /api/v1/departures/{flightId}/history` | Chronological observations for one stable dated departure. |
| Fare calendar | `GET /api/v1/fares/calendar` | Minimum available fare and coverage for each departure date in one collection run. |
| Route statistics | `GET /api/v1/routes/{route}/statistics` | Mean, median, bounds, standard deviation, coefficient of variation and P10/P25/P75/P90/P95, plus outcomes. |
| Booking window | `GET /api/v1/routes/{route}/booking-window` | Horizon curve using only completed departures with all 45 collection results. Fare percentiles exclude unavailable fares. |
| Airline comparison | `GET /api/v1/airlines/compare` | Equal weight for search-date/departure/horizon cells shared by all represented carriers. |
| Volatility | `GET /api/v1/routes/{route}/volatility` | Consecutive available observations of the same departure; rise, drop and unchanged rates plus absolute movements. |
| Airfare index | `GET /api/v1/indices/airfare` | Pairwise matched airline/horizon/time cells, averaged inside equally weighted routes. Returns daily/weekly/monthly; prior-year is insufficient with 365 days. |
| Policy observatory prototype | `GET /api/v1/indices/airfare/government` | A fixed 30-day basket of route/airline/booking-window/time-band fare medians, weighted by synthetic scheduled-service counts. Returns daily/weekly/monthly changes, 9-point series, route/city breakdowns and coverage. |
| Route heatmap | `GET /api/v1/analytics/heatmap` | Route changes from the same matched-cell index method at a selected lag. |
| Anomalies | `GET /api/v1/analytics/anomalies` | Current values beyond three IQRs from a preceding 90-day route/airline/horizon/time-band baseline. |
| Festival/event | `GET /api/v1/analytics/events/{name}` | Event window versus a 28-day-earlier matched weekday, airline, horizon and time-band baseline. This is descriptive association. |
| Prediction | `GET /api/v1/prediction/{origin}/{destination}` | Experimental 1/3/7-day estimates from completed same-flight transition ratios, with empirical P10–P90 bands. |
| Alerts | `POST /api/v1/alerts`, `POST /api/v1/alerts/evaluate` | Stores a route/date threshold and creates deduplicated in-app notifications from available observations. |

The policy endpoint requires `datasetId`, accepts optional `asOf`, and returns `dataMode: SIMULATED` with `data.status: PROTOTYPE_ONLY`. It is **not official CPI or measured airfare inflation**. Scheduled-service counts are only a proxy for passenger or expenditure weights; year-on-year change is intentionally omitted until comparable prior-year data exists. Its response includes the index series, movement percentages, route and city comparisons, coverage, and methodology.

Other analytics envelopes contain `dataMode`, `methodVersion`, `datasetId`, `asOf`, `sampleCount`, `collectionResults`, `collectionSuccessRate` and `lastObservedAt`.

Administrative/support endpoints include catalog lists, dataset listing, health and collection-run coverage. Ingestion is under `/api/v1/ingestion` and currently accepts simulator datasets only.
