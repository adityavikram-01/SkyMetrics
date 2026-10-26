# APIx Airfare Intelligence backend

Spring Boot 3.5 + Java 21 + MySQL prototype for the APIx synthetic airfare dataset.

Every response is labelled `SIMULATED`. The prediction and airfare index are experimental; they are not validated against real Indian fares and must not be published as official market statistics.

## What is implemented

- Normalized JPA entities for airports, airlines, directional routes, scheduled services, dated departures, datasets, daily collection runs, collection outcomes, fare observations, simulator inventory, calendar events and alerts.
- Flyway migrations with foreign keys, unique constraints, amount/state checks and append-only fare triggers.
- Transactional and idempotent daily ingestion. One configured service × horizon must appear exactly once. Collection failures create no fare observation.
- Search, same-flight history, price intelligence, manual quote evaluation, fare calendar, route statistics, booking-window curve, airline comparison, volatility, experimental airfare index, route heatmap, anomaly detection, event comparison and experimental prediction.
- In-app threshold alerts and collection-run administration.

## Run with MySQL

Create an empty MySQL database and user:

```sql
CREATE DATABASE apix_prototype CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'apix'@'127.0.0.1' IDENTIFIED BY 'choose-a-password';
GRANT ALL ON apix_prototype.* TO 'apix'@'127.0.0.1';
```

Copy `.env.example` to `.env` and set the database URL, username and password. Do not commit `.env`.

```sh
./mvnw clean test package
./scripts/run.sh
```

Flyway creates and validates the schema. On a MySQL server with binary logging, the database administrator may need to permit trigger creation or install the trigger migration with an account that has the required privilege.

## Import mimic data

With the backend running:

```sh
python3 scripts/import_mimic.py --input ../airfare_mimic/output/year
```

The importer registers the dataset and sends one atomic request per collection date. It can be stopped and rerun safely because dataset and run payloads are idempotent.

For a quick prototype import:

```sh
python3 scripts/import_mimic.py --input ../airfare_mimic/output/year --limit 60
```

## Example requests

Replace `{datasetId}` with the value printed by the importer.

```http
GET /api/v1/intelligence/BOM/DEL?datasetId={datasetId}&departureDate=2025-11-20
GET /api/v1/routes/BOM-DEL/booking-window?datasetId={datasetId}
GET /api/v1/airlines/compare?datasetId={datasetId}&route=BOM-DEL&days=30
GET /api/v1/indices/airfare?datasetId={datasetId}
GET /api/v1/analytics/heatmap?datasetId={datasetId}&lagDays=30
GET /api/v1/analytics/anomalies?datasetId={datasetId}&route=BOM-DEL
GET /api/v1/analytics/events/Diwali?datasetId={datasetId}
GET /api/v1/prediction/BOM/DEL?datasetId={datasetId}&departureDate=2025-11-20
```

The API returns `INSUFFICIENT_DATA` when a method lacks its minimum comparable sample. It does not silently broaden comparisons.

## Main API groups

See [API.md](docs/API.md) for endpoints and calculation rules. Security is intentionally deferred for this local prototype. The application binds to `127.0.0.1` by default; add authentication before exposing it on a network.
