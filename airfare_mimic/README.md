# SkyMetrics synthetic airfare dataset

The final research scenario is `config/final-synthetic.json`. It has 24 directional routes, 192 illustrative daily flight services, five selected carriers, four departure-time bands on every route, 730 daily collections, and all 45 booking horizons. This is **6,307,200 collection results**, including unavailable offers and simulated collection failures. A result is a repeated search for a particular dated flight, not a unique flight or a sold ticket.

Generate and audit it with Python 3.11+:

```sh
python3 build_final_config.py
python3 audit_final.py --output output/final-audit.json
python3 simulator.py --config config/final-synthetic.json --out output/final
python3 verify_generated.py output/final
```

Use a new output directory for every run. The generator refuses to overwrite an existing database. The full dataset is several gigabytes; `output/` is local and ignored by Git. `manifest.json` records the exact config hash, expected row count, outcome counts, and synthetic status. The 45 complete horizons are needed for the current booking-window analysis and flexible-date calendar. Never present these rows as scraped fares or verified airline schedules.

See `docs/final-synthetic.md` for assumptions, user/government feature coverage, limitations, and how the old local dataset should be replaced only after import and API checks.

**SIMULATED / PLAUSIBILITY_VALIDATION.** These are not real quotes. Real-market or forecast accuracy is unknown.

## Ready outputs

- `output/year/report.html`: annual descriptive report and horizon chart.
- `output/year/observations.csv.gz`: all annual collection results, including failed searches.
- `output/year/airfare.sqlite`: related tables; failures never become fare observations.
- `output/year/example_flight_history.csv`: a single BOM–DEL dated departure across its observation history.
- `output/year/summary.csv`: route, airline, horizon, month, weekday, time and event summaries.
- `output/day/`: exactly one selected collection date.
- `output/sensitivity.csv`: fixed-seed scenario effects; see docs/model.md for limits.
- `docs/evidence.md`: citations and assumptions.

## Generate a legacy or single-day sample

Python 3.11+; generator/report/tests use only the standard library. From this folder:

```sh
python3 simulator.py --config config/default.json --out output/new-year
python3 simulator.py --config config/default.json --date 2026-09-13 --out output/new-day
python3 report.py output/new-year
python3 -m unittest -v
```

`end_date` is the last collection date. `days: 365` includes that day and the preceding 364 dates. Departure dates extend 45 days beyond the last collection date. `--date` generates exactly one collection run. The generator never overwrites an existing output database; use a new output folder to rerun it.

Copy `config/default.json` to change parameters. Reusing a seed gives comparable random streams. `routes.*.baseline` is a simulated INR baseline. `near_departure_boost` affects late fares, `bookings_per_day` affects simulated inventory, and `hold_probability` controls unchanged quotes. Event entries contain a date, routes, window and assumed multiplier. Keep the date's source separate from its assumed fare effect. Update events when extending the date range; omitted holidays do not appear automatically.

`conservative.json` reduces noise, late rises and bookings; `stress.json` increases them. Service schedules are illustrative, not airline timetables. Add scheduled services when adding routes or airlines. Horizons 1–45 are supported; extending beyond 45 days requires a model change.

In the CSV, `total_paise` is the exact integer amount and `total_amount` is a readable rupee amount. A blank amount marks an unavailable or failed search. `latent_remaining` is internal simulated inventory, never airline-reported seats. Every result has `is_synthetic=True`; never replace it with false.

## Scope

Delivered: working generator, annual and daily datasets, configuration scenarios, tests, SQLite prototype, descriptive validation and evidence. This is not the entire production platform from the master prompt. Full regional calendars, verified historical schedules, real-data calibration, complete PostgreSQL/Spring Boot schema and authenticated ingestion/query/admin services remain separate work. No data was sent to an external endpoint.
