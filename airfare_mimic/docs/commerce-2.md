> MySQL update, 11 October 2026: import and JPA access are now verified. See [MySQL storage and validation](../../apix-backend/docs/commerce-mysql.md). Website endpoint activation remains pending. The initial checklist below records the extension-stage boundary.

# Commerce revision 2 — dataset extension, not app activation

The final data remains at `output/commerce-final/airfare.sqlite`. All 25,228,800 baseline observations remain. `schema_revision` links the extension fingerprint to the original dataset identity. No old active application dataset has been deleted.

## Implemented and tested

- Seventeen scenario fare policies across five carriers, with different baggage, meals, seat-selection, change/cancellation fees and package premiums. New offers must read `offer_policy`; `fare_product` is retained solely for legacy compatibility.
- Economy plus assumed Air India business cabins and a subset with premium economy. Cabin capacities sum to aircraft capacity. The `cabin_observation` view divides observed total availability without duplicating seats. This is proportional simulated allocation, not independent premium demand modelling.
- Adult/child/lap-infant pricing in integer paise, explicit line totals, up to nine seated passengers and at most one lap infant per adult. Child ratios and infant fees are illustrative. Cabin multipliers affect base fare; inherited taxes are illustrative, not a validated tax engine.
- Three weighted simulated rating components per carrier. These are demonstration attributes, not customer reviews, measured reliability or an airline recommendation. Review counts remain absent.
- Airport-specific assumed self-transfer buffers, same-observation-day checks, duration limits, baggage minimum and combined leg totals. No protected through-ticket claim.
- Route profiles with counts and explicit evidence status; actual carrier presence and schedules are not established by aggregate traffic reports.

## Official reference material consulted

The `calibration_source` table stores the links, consultation date and narrow scope. These sources informed structure and baggage/product distinctions; they do not certify all numeric scenario rules or reconstruct historical rules.

- https://www.goindigo.in/travel-information/en/baggage-allowance.html
- https://www.goindigo.in/travel-information/en/fare-rules.html
- https://www.airindia.com/content/dam/air-india/newsroom/press-releases/pdf/Press_Release_Air_India_Fare_Families_21Oct24.pdf
- https://flights.airindiaexpress.com/en-in/domestic-flights
- https://sme.akasaair.com/smeusermanual.pdf
- https://corporate.spicejet.com/Baggage.aspx

DGCA supplied aggregates remain the demand calibration source. They do not establish fare quotes, route-airline assignment, individual aircraft configurations or ratings. The existing assumed roster was retained rather than replacing it with another unsupported roster. Route-service verification remains open.

## Validation

Fifteen unit tests cover existing generator behaviour plus capacity conservation at every availability from 1 to 180, airline policy diversity, family pricing, invalid passenger combinations, transfer timing and observation-date mismatches, and refusing repeat migration. Full-file results are in `output/commerce-final/extension-audit.json`.

## Required before calling the project finished

1. Import and verify these structures in local MySQL with matching lazy JPA relationships and indexed/paginated queries. This revision has NOT performed that import.
2. Integrate quote and connection functions into the backend; expose filters and passenger/cabin/package choices in the frontend.
3. Revalidate the government baseline basket and clearly separate baseline economy from derived cabin prices.
4. Connect saved trips and alerts to new offer identities. Verify end-to-end comparisons and notifications.
5. Independently verify route-airline schedules if presenting anything beyond an assumed network. Do not label this dataset live or historically accurate.

No live booking, payment, PNR, individual seat map, authentic review history, infant safety-capacity inventory or forecast accuracy is implemented. These need additional domain data and workflows. This extension reduces regeneration needs but cannot guarantee every unknown future feature without migrations.
