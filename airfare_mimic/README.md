# APIx airfare mimic — runnable dataset prototype

**SIMULATED / PLAUSIBILITY_VALIDATION.** Real data nahi hai. Real-market accuracy abhi unknown hai.

## Ready outputs

- `output/year/report.html`: annual descriptive report and horizon chart.
- `output/year/observations.csv.gz`: all annual collection results, including failed searches.
- `output/year/airfare.sqlite`: related tables; failures never become fare observations.
- `output/year/example_flight_history.csv`: a single BOM–DEL dated departure across its observation history.
- `output/year/summary.csv`: route, airline, horizon, month, weekday, time and event summaries.
- `output/day/`: exactly one selected collection date.
- `output/sensitivity.csv`: fixed-seed scenario effects; see docs/model.md for limits.
- `docs/evidence.md`: citations and assumptions.

## Generate / dates badlo

Python 3.11+; generator/report/tests use only the standard library. From this folder:

```sh
python3 simulator.py --config config/default.json --out output/new-year
python3 simulator.py --config config/default.json --date 2026-09-13 --out output/new-day
python3 report.py output/new-year
python3 -m unittest -v
```

`end_date` last search date hai; `days: 365` se us din ko include karke ek saal banta hai. Departure dates last search ke 45 din baad tak jaati hain. `--date` exactly ek run generate karta hai. Existing output database overwrite nahi hota: rerun ke liye naya output folder do.

`config/default.json` copy karke parameters badlo. `seed` same rakho to comparable randomness milti hai. `routes.*.baseline` simulated INR baseline hai. `near_departure_boost` badhane se late fares generally rise karte hain. `bookings_per_day` badhane se inventory jaldi fill hoti hai. `hold_probability` unchanged quotes ka control hai. `events` mein date, applicable route labels, pre/post days aur multiplier hain. Date ka official source aur uplift assumption alag rakho. New date range ke liye calendar events update karo; omitted holidays automatically appear nahi hote.

`conservative.json` has smaller noise/late rise/bookings; `stress.json` has larger values. Carrier schedule profiles illustrative hain, actual airline timetable nahi. New routes/airlines add karo to unke services bhi add karo. Horizons 1–45 supported; full annual default mein sab 45 included hain. Model beyond 45 days expand karne ke liye code change chahiye.

CSV mein `total_paise` exact amount hai; `total_amount` readable rupees hai. Blank amount unavailable/failure ko indicate karta hai. `latent_remaining` internal simulated inventory hai; UI par airline-reported seats ke naam se mat dikhao. Har result `is_synthetic=True` rakhta hai. Never replace this flag with false.

## Scope

Delivered: working generator, annual and daily datasets, configuration scenarios, tests, SQLite prototype, descriptive validation and evidence. This is not the entire production platform from the master prompt. Full regional calendars, verified historical schedules, real-data calibration, complete PostgreSQL/Spring Boot schema and authenticated ingestion/query/admin services remain separate work. No data was sent to an external endpoint.
