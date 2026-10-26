> Updated 11 October 2026: the original generation report below describes commerce-1. The same final SQLite file now also contains additive commerce-2 tables. Read [commerce-2.md](commerce-2.md) for current capabilities and remaining integration work. Baseline observations were retained, not regenerated.

# Flight-offer dataset

Status: generated and structurally audited; not activated in the application.

## Generated scope

- Database: `output/commerce-final/airfare.sqlite` (SQLite, not MySQL).
- Version: `commerce-1`; manifest records the generator fingerprint and dataset identity.
- 48 directional routes, 14 airports, five carriers, 576 assumed daily services.
- 8–21 services per direction; counts use a bounded allocation informed by relative passenger traffic, not actual timetables.
- 730 collection days ending 5 October 2026; 60-day booking horizon.
- 454,464 dated departures and 25,228,800 repeated observations.
- 1,562,181,632 bytes including current search indexes.
- Economy, 1–9 adults. Three illustrative fare packages per carrier share the same flight inventory.

## Source boundary

`calibration/network-48/dgca.json` retains source filenames, hashes, sheets and row numbers. It contains user-supplied reports, not independently authenticated downloads. Passenger traffic calibrates relative route demand; airline monthly load factors calibrate aggregate occupancy assumptions. Neither establishes actual airline presence on a route, aircraft assignments, timetables, fares, live seats or service quality.

May 2024 city-pair data is absent and uses a neutral seasonal factor. Cargo-only operators are excluded from passenger offers. GOA traffic is assigned to GOI for the scenario; GOX attribution cannot be established from this source. The five-carrier roster is a contemporary scenario across the whole simulation, not a reconstruction of mergers or historical network changes. Historical load factors are retrospective simulation inputs, not information known at every forecast origin.

## Feature contract

| Feature | Data and application responsibility |
|---|---|
| Airline, date, departure/arrival time, duration filters | `service`, `departure`, `route`; UTC minutes are minutes since Python ordinal day 1, not Unix time. Local airport zone is Asia/Kolkata. |
| Budget and total price | Available observation base + tax + fee + fare-product surcharge, multiplied by adult count. INR integer paise throughout. |
| Passenger availability | `bookable_seats` must cover the group; all fare packages reference the same inventory. This is a quote, not a seat reservation. |
| Baggage, refundability, meals, seat-selection filters | `fare_product`; all terms are explicitly simulated policies. Refundable does not mean free cancellation. |
| Ratings | `service_rating.kind=SIMULATED_SERVICE_RATING`; review counts are NULL. Never display as customer feedback. Best-match ranking must be calculated separately. |
| Fare history and booking analysis | Fixed departure identity with daily observations, including missing and unavailable outcomes. |
| Nearby dates and alerts | Query travel date ±7 days within the 60-day horizon. Bounds must be shown near dataset edges. Alert evaluation and delivery require application work and advancing observations; this frozen file does not send notifications. |
| Connections | Join actual simulated legs using UTC times, 2–6-hour assumed connection gap and bounded total duration. These are separate-ticket self-transfers, not protected airline itineraries. Recheck both offers on the same collection date. |
| Government analysis | Available baseline economy offers and source coverage; basket selection, weights, reports and exports need integration and regression checks. Source weights and scenario service counts must not be confused. |
| Accounts, preferences, saved trips | Remain in application account storage, not the simulated fare database. |

No live booking, passenger reviews, actual remaining seats, child/infant pricing, premium cabins, disruption protection or guaranteed forecasts are included. These must not appear as working capabilities merely because a generic schema field could accommodate them. Additive policy/cabin tables or targeted inventory extensions can support later work without discarding baseline observations; suitability must be checked first.

## Validation performed

- Ten unit tests pass across the existing simulator, route selection and commerce model.
- Full database integrity and foreign-key checks pass.
- Nine audit checks pass; all 48 routes have available offers at the selected 21-day horizon.
- 60 sampled departures / 1,800 observations match the corrected pilot exactly.
- Terminal mean simulated occupancy is 83.4%; this is descriptive, not evidence of route-level calibration accuracy.
- 46,564 sold-out results remain distinct from no-offer and collection failures.
- Representative BOM–DEL search has 142 timed self-transfer candidates; no assertion that they are all cheaper or desirable.
- A representative route-coverage query took 0.002 seconds locally. This is not an end-to-end website performance guarantee.

The first pilot exposed missing sold-out scenarios and was retained for diagnosis. The corrected pilot passed before full generation. The full database has a generator-content fingerprint to avoid treating changed model implementations as identical datasets.

## Activation gate

Do not point the running application at this schema yet. Existing Java readers expect the previous tables. Integrate a version-aware reader, expose offer details, validate filters/group totals, rebuild government calculations, and compare representative user/government results first. Retain the current active database until both workspaces pass. No original data has been removed, no live service updated and no credentials accessed.

## Reproduction

From `airfare_mimic/`, use the bundled Python with openpyxl for source preparation. The generator itself uses the standard library.

```
python3 build_network_scope.py
python3 -m unittest test_simulator test_network_scope test_commerce_dataset
python3 commerce_dataset.py --out output/new-validation-run --days 30
python3 audit_commerce.py output/new-validation-run/airfare.sqlite --out output/new-validation-run/audit.json
```

The generator refuses to overwrite an existing database. Do not regenerate the full dataset for ordinary frontend changes. Use the existing final file and migrations where appropriate.
