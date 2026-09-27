# Model 0.1.0

All money is persisted in integer paise. The generator rounds simulated available fares to INR 10, then clips to configured safety bounds. No base/tax/fee split is invented. A single fixed comparable product is used: one adult, economy, one-way, nonstop.

For each service and departure date, create a stable UUID and a dedicated seeded random stream. Simulate every horizon in chronological observation order from h=45 to h=1, even when exporting a subset. This warm-up makes daily and annual selections consistent. SHA-256 of canonical config identifies the parameter set; UUID5 identifies datasets, runs and departures. Reproduction requires the same Python version, model code, configuration and seed. Export selection changes dataset identity but not overlapping flight physics.

## Inventory

Initial occupied fraction is Uniform(0.25,0.55), rounded to seats; capacity defaults to 180. On each day, each occupied seat independently cancels with probability 0.004. New arrivals follow Binomial(20, min(0.95, d/20)), where d = bookings_per_day × calendar_factor × (1 + 0.7 exp(-h/8)). Arrivals accepted cannot exceed restored remaining capacity. Remaining inventory is previous remaining + cancellations − accepted arrivals. Sold out means remaining equals zero. Cancellations can reopen a sold-out departure. Inventory is latent simulator state, never an airline-reported seat count.

The 20-arrival ceiling is an engineering simplification; high booking settings saturate. This is not an optimized airline revenue-management policy; demand does not respond to the quoted price. The 45-day opening inventory stands in for earlier sales.

## Fares

Target = route_baseline × airline_factor × time_factor × flight_effect × calendar_factor × bucket × H(h) × exp(noise + shared_shock).

H(h) = 1 + near_departure_boost × exp(-h/7) + early_premium × [max(h−25,0)/20]^2.

This chosen curve allows a shallow early premium and a stronger late rise. It is not an estimated Indian booking curve.

Flight effect = exp(clip(Normal(0,0.10),−0.25,0.25)). Occupancy buckets: below 60% → 1.00; below 80% → 1.12; below 93% → 1.32; otherwise → 1.60. Calendar factor combines departure month, departure weekday, and route-specific events. Event multipliers taper linearly away from the named date; simultaneous events multiply up to event_cap. Calendar factors influence both sales and price; this intentionally amplifies their total effect.

Noise follows a clipped AR(1): epsilon_t = clip(rho epsilon_(t−1) + Normal(0, sigma sqrt(1−rho²)),−0.3,0.3), initialized at zero at T45. Shared route/day and airline/day shocks are seven-day moving sums of bounded uniforms, divided by sqrt(7). Route amplitude is 0.08 and airline amplitude 0.04. These fixed constants are engineering assumptions. A configured hold probability retains the previous latent quote; otherwise a new bounded target is posted. Changes can rise, fall or remain unchanged. The latent quote continues evolving even when no fare is visible.

## Collection and output

At 09:00 IST (03:30 UTC), record every configured service × horizon for each search date. A deterministic independent collection draw can override business outcome with a collection failure. Failed collections have collection_result and latent state, but no fare_observation. SOLD_OUT and NO_OFFER have a successful result and null fare. AVAILABLE has a positive amount. Null does not mean zero. CSV is a denormalized convenience export of collection results, including failures; use SQLite tables for actual fare observations.

The SQLite prototype separates reference data, services, dated departures, runs, results, fare observations and latent inventory. A simulation-only CHECK constraint prevents live labels. It is not a production Spring Boot ingestion service: service credentials, full enterprise schema, admin workflows, retention, alerts and publication permissions are not implemented. Do not connect this database to live index publication.

## Validation interpretation

Structural checks establish consistency, not similarity to unobserved historical fares. P10–P90 chart shading is simulated dispersion, not a confidence interval. Summary groups are marginal rather than all possible cross-products. Pooled lag-one price correlation includes route differences and horizon trend, so it must not be presented as residual autocorrelation. Sensitivity comparisons are fixed-seed scenario tests, not calibration or confidence intervals. Out-of-sample real accuracy remains unknown.
