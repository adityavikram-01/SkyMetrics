# Evidence and assumption register — accessed 2026-09-13

This is an evidence-informed synthetic prototype, not calibrated Indian historical data. All numerical pricing and inventory parameters are ENGINEERING_ASSUMPTION. No parameter is FITTED_TO_REAL_DATA. Research supports mechanisms, not the numerical parameters chosen here.

| ID / class | Source / publisher / period | Supported use | Does not establish |
|---|---|---|---|
| ROUTES / CURRENT_SNAPSHOT | [OAG India aviation briefing](https://www.oag.com/indian-aviation-data), OAG, September 2026; publication day not stated | The ten configured directional route labels appear in the September 2026 domestic scheduled-capacity ranking. The five selected Indian carriers appear in its airline capacity table. | Historical daily flight schedules, fares, route-level carrier availability or domestic-only airline market shares. Monthly capacity must not be read as observed demand. |
| DYNAMIC / RESEARCH_SUPPORTED | [Williams, Yale Cowles paper](https://cowles.yale.edu/sites/default/files/2022-09/d2103-u3.pdf), August 2021 revision, United States flight-level data | Prices can respond to demand and inventory over time; early and late consumers differ; prices can rise or fall. | Indian route-specific parameters, an exact universal J curve, or real-data accuracy of this simulator. |
| CAL2025 / OFFICIAL_SOURCE | [IGNFA government holiday list](https://www.ignfa.gov.in/document/holidays-list-2025.pdf), central offices in Uttarakhand, calendar year 2025, references July 9 2024 DOPT order | Selected dates: Dussehra October 2; Diwali October 20; Christmas December 25. | Countrywide holiday observance patterns or airfare uplift. |
| CAL2026 / OFFICIAL_SOURCE | [CAG Defence New Delhi holiday list](https://cag.gov.in/defence/new-delhi/en/page-defence-new-delhi-holidaylist), updated February 24 2026, calendar year 2026 | Selected dates: Republic Day January 26; Holi March 4; Independence Day August 15; Gandhi Jayanti October 2; Dussehra October 20. | Complete relevant state calendars or any demand multiplier. The page has a questionable Muharram entry; that date is not used. |

No restricted booking site was scraped. NBER paper endpoints returned access errors; the accessible Yale original paper was used instead. No fare snapshots or real validation dataset were acquired. This limited research does not establish that no public reference datasets exist.

## Numerical assumptions

- Route baselines INR 3,500–6,400 are illustrative; not measured fare floors or medians.
- Carrier multipliers 0.95–1.10 are scenario controls, not measured airline price differences.
- 46 daily services, SIM-prefixed flight numbers, departure times, route/carrier pairings, fixed 180-seat capacity and durations are illustrative. Coverage is deliberately balanced for testing, not traffic weighted. Historical route operation and schedule changes are not verified.
- Occupancy, daily bookings, cancellations, fare-bucket thresholds, horizon coefficients, monthly factors, weekend factor, time factors, noise, held prices, missing offers and failure rates are assumptions.
- Official event dates and assumed event demand effects are distinct. Configured route exposure, windows, a 22% peak event multiplier and overlapping-event cap are assumptions.
- Seed, IDs, 09:00 IST observation time, bounds and output format are engineering controls.
- Fixed comparable product: one adult, economy, one-way, nonstop, total mandatory payable amount in INR. Ancillaries, fare families, refunds and tax splits are not modelled.

Every config leaf is listed in `parameter_provenance.json`. The default classification applies to internal fixed constants documented in model.md as well. This version has selected holidays only; comprehensive state calendars remain outstanding.
