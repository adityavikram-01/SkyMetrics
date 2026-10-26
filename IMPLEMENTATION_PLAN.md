# SkyMetrics product rebuild

## Goal

Turn the current single-screen APIx prototype into a modular SkyMetrics product while preserving the working airfare data and analytics engine. The current fare dataset remains explicitly simulated. No page will imply an official CPI or a live airline offer.

## Product areas

| Area | Route | Audience | First release |
|---|---|---|---|
| Consumer | `/flights` | Traveller | Fare check, route intelligence, saved trips, watches, alerts and profile |
| Policy | `/policy` | Government/research analyst | Fixed-basket index, route and city movement, coverage and methodology |
| Partners | `/developers` | B2B developer | API catalogue, coverage, example requests and access status |
| Operations | `/admin` | SkyMetrics operator | Dataset and collection-run health, counts, ingestion status and quality flags |

`/` is a public product entry page. The four areas have separate navigation and page shells while sharing UI components and the analytics API client.

## Backend design

Keep a modular Spring Boot application. Split controllers and services by `identity`, `consumer`, `policy`, `partner`, `operations`, `analytics`, and `ingestion`. The normalized fare tables and existing analytics remain the source of truth.

Security boundary: public fare analytics remain readable. Self-signup creates only a traveller. `/api/v1/policy/**` requires `GOV_ANALYST` or `ADMIN`; `/api/v1/partner/**` requires `PARTNER` or `ADMIN`; `/api/v1/ops/**` and ingestion require `ADMIN`. Admin and analyst accounts must be provisioned by an administrator, never selected during signup. Store passwords as BCrypt hashes; use server sessions with HttpOnly cookies and CSRF protection for browser writes. Never put credentials or API keys in URLs or local storage.

Personal records must belong to the authenticated user. A saved trip, watch, alert and notification must not be readable by another account. Existing global alert endpoints must be retired or protected before public deployment.

Policy outputs carry `SIMULATED` status, observation window, coverage, base date and weighting method. The official CPI label is reserved for a separately reviewed data product.

## Implementation sequence and acceptance checks

1. **Foundation:** create route-based frontend modules, public landing, independent area navigation, and shared design tokens. Existing fare search and policy calculations keep working. Direct links and browser back work.
2. **Identity and personal data:** add account tables, signup/login/logout/session endpoints and owned trip/watch/alert data. Passwords are hashed; unauthenticated and cross-account requests fail.
3. **Policy and partner:** move the current index behind role checks; add dedicated policy and partner pages. The partner catalogue shows actual supported endpoints and clear access status.
4. **Operations:** show dataset coverage and collection health from real backend queries; restrict ingestion and operations to admins.
5. **Deployment:** replace the temporary Vite tunnel with a production web server and stable hosting. Run backend integration tests and frontend build before release.

The public demo can show restricted-area previews, but they must be labelled preview and contain no protected data until login and roles are configured.

## Do not add yet

Redis and Kafka are deferred until the separated product and identity flows are stable. One Spring Boot backend is sufficient at this scale. A real government account, official CPI claim, live notifications and commercial API keys require their corresponding data, review, and operations work.
