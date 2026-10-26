# Commerce dataset in local MySQL

Verified on 11 October 2026. The final dataset is imported into `apix_prototype` in Docker container `apix-airfare-intelligence-database-1`, reachable locally at `127.0.0.1:3308`. Authentication stays in the existing container environment; this document contains no credentials.

## Storage

- 25,228,800 observations; 454,464 departures; 576 services; 48 routes; 14 airports; 5 airlines.
- 17 source tables under `cm_`, plus `cm_route_day_summary` and an import-checkpoint table.
- 35,040 route/day summary rows for the 21-day economy baseline.
- Approximately 2,742.5 MiB including indexes, measured from MySQL table statistics (not exact volume usage).
- Persistent volume: `apix-airfare-intelligence_apix_mysql_data` at `/var/lib/mysql`.
- InnoDB buffer pool persisted at 512 MiB; Docker reported approximately 8 GB allocated memory. Durability and foreign-key enforcement were retained.

## Relationships and queries

Eighteen JPA entities live under `com.apix.commerce.model`. Routes reference airports, services reference routes and airlines, departures reference services, observations reference departures, and policies/cabins reference their parent entities. Composite keys identify departure+collection date, service+cabin and carrier+rating component. Relations use lazy loading with scalar foreign-key ownership; no cascading deletes or huge inverse collections are configured.

`CommerceQueries` provides bounded read-only flight search and history using projection repositories. Search returns 50 items per slice; history returns 60. Search seats reflect the scenario economy allocation. Prices here are the baseline offer, before selecting fare-package and passenger options. `CommerceRouteSummaryRepository` reads indexed descriptive daily summaries. A mean fare is not a matched-basket index.

Main indexes:

- service: route, airline, service id;
- departure: service+travel date (unique), and travel date+service;
- observation: departure+collection date (primary), collection date+departure;
- policy: airline+cabin+baggage+refundability;
- summary: route+collection date (primary), collection date+route.

UTC timestamps and collection dates were converted from the source's ordinal encoding. Integer paise are preserved; no floating-point conversion is used for money.

## Verification

- All source-table row counts match.
- Counts by outcome and sums of base fares, taxes, fees, remaining seats, arrivals and cancellations match SQLite.
- Cabin capacities conserve total aircraft capacity; UTC conversion checked.
- Flyway schema at V6; 19 backend tests passed, including real-MySQL Hibernate schema validation, lazy relationships, search/history and summary pagination.
- Representative local `EXPLAIN ANALYZE`: flight search approximately 7.72 ms (21 results), full 60-point history 0.051 ms, 365-day route summary 1.35 ms, all-route daily summary 0.203 ms. Single-client measurements are not concurrency or future-scale guarantees.

Reports: `airfare_mimic/output/commerce-final/mysql-import.json` and `mysql-audit.json` from the project root.

## Maintenance

Flyway migrations V5 and V6 create the additive schema. A pre-existing database-default collation mismatch was aligned with the legacy tables before the pending V3/V4 migrations could run. Existing fare tables were not replaced.

From `apix-backend/`, the importer can resume interrupted chunks:

```sh
python3 scripts/import_commerce_mysql.py \
  --source ../airfare_mimic/output/commerce-final/airfare.sqlite \
  --container apix-airfare-intelligence-database-1 \
  --report ../airfare_mimic/output/commerce-final/mysql-import.json
```

It uses local container administrative access only for import; credentials remain inside the container. It refuses mixed dataset revisions and untracked target rows. Each chunk commits with a checkpoint. Failed chunks can be retried; do not manually delete checkpoints. `scripts/refresh_commerce_summaries.sql` atomically rebuilds the derived summaries after a completed import.

## Users application integration

The users application now reads flight search, booking-time history and route trends through `/api/v1/traveller` from the imported MySQL commerce tables. `preview.json` is a test fixture only; it is not bundled as the live application data source.

Run `START_SKYMETRICS.command` from the project root. It starts the existing identity database and the local app. The backend launcher starts Docker when needed, then the existing commerce container, and supplies its connection configuration internally without printing credentials.

Responsibilities:

- `UsersPage` coordinates search loading and errors; UI components render the results.
- `travellerApi` is the search/trends HTTP boundary; `authApi` handles authenticated account writes with CSRF.
- `offerModel` contains independently tested fare-package, passenger, filtering and connection calculations.
- `TravellerController` and `TravellerSelections` expose HTTP operations; their services handle data retrieval and validation.
- A bounded read-only commerce pool serves the final fare dataset. The original identity database retains accounts and owns saved selections. Flyway V7 adds `traveller_selection` with a user foreign key.

Saved flights and price alerts persist per account. Alerts check available direct fares for the requested cabin and travellers, optionally within seven days either side. Evaluation occurs on retrieval; there is no background scheduler or email delivery. Saved prices are snapshots, not bookable offers. Booking-time analysis is descriptive simulated history, not a validated prediction.

The government workspace and original project remain unchanged. No deployed environment or Git remote was changed.
