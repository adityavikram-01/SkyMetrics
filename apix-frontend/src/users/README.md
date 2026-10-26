# Users workspace

`UsersPage` loads authenticated `/api/v1/traveller/search` results. `UsersWorkspace` owns search/filter/compare interactions; components own their presentation. `offerModel.js` calculates simulated cabin and passenger packages from the returned records. `catalogLabels.js` contains only airport/airline labels and filter defaults, not fares.

The backend reads the final imported `cm_*` MySQL tables with bounded route/date queries. A search loads a ±7-day calendar and relevant connecting legs; the date picker supports the dataset's 60-day booking window. `FareTrends` reads the indexed 21-day route summaries. History uses completed departures from the previous 30 travel dates and is descriptive, not a prediction.

Saved flights and alert preferences are account-owned in `traveller_selection` in the existing identity database. Alerts check available direct offers against the latest stored collection when opened; price matching includes travellers, cabin and optional ±7-day dates. Email delivery and live booking are not implemented. Authentication and CSRF protection apply to the APIs; the old development preview route now also requires sign-in.

`preview.json` remains only as a regression-test fixture. It is not imported into the app bundle. No original dataset or original project was removed.
