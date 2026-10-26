# Synthetic fare behaviour v1

Apply `scripts/commerce-fare-behaviour.sql` to the existing commerce MySQL database before running the updated backend. It is idempotent.

The 576-row service factor table and MERGE view preserve original observations without duplicating them. Traveller search, history and trends read the same adjusted prices. Fees and inventory stay unchanged. Cabin and fare-product multipliers remain in the existing offer model; they must not be applied twice.

Existing generated prices already model route baseline, carrier, monthly demand, events, weekend travel, occupancy, lead time and shared weekly shocks. New factors add concentration (schedule-share HHI), a bounded frequency discount, and local departure-time preferences. Weekday commute peaks differ from leisure and weekend preferences. Coefficients are transparent illustrative assumptions, not estimates from DGCA or proven real-world relationships. Schedules and available seats remain simulated. Actual aircraft assignments and review medians are not established by this change.

Rollback: point TravellerData search/history back at cm_observation and restore the prior summary-based trends query. Raw data are unchanged. The source SQLite generator is unchanged; reimport requires reapplying this SQL.


## Published reference facts (checked 26 Oct 2026)

cm_public_reference stores published configurations, certified airline-level Skytrax stars, and a dated SpiceJet timetable snapshot for direct covered routes. The app exposes certified stars as a carrier quality filter and includes source links in fare details. They are not route medians or passenger ratings and do not change prices. No review median is computed because validated route-level review samples were not available. Configuration seats describe published layouts; they do not establish the aircraft or live available seats for a simulated service. The schedule snapshot is held separately and never substitutes for the simulated search inventory.

Refresh source references with python3 scripts/refresh_public_references.py after updating scripts/public-flight-references.json.
