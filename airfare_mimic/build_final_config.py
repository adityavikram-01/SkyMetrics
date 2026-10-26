"""Build the auditable final synthetic scenario without changing the legacy dataset."""
import copy
import json
import math
import statistics
from pathlib import Path

from simulator import validate


HERE = Path(__file__).resolve().parent
source = json.loads((HERE / "config/research-informed.json").read_text())
c = copy.deepcopy(source)
c.update(
    model_version="0.2.0",
    behaviour_model_version="route-regime-v2",
    seed=20261006,
    end_date="2026-10-05",
    days=730,
    horizons=list(range(1, 46)),
    hold_probability=0.30,
    near_departure_boost=1.25,
    noise_sigma=0.055,
    price_bounds=[1800, 42000],
)

# User-provided Freshly_cleaned.csv: Economy + nonstop only, 2022-derived.
# These are route medians (INR), never treated as current quotes. The shared
# level is removed and only a bounded 35% relative-pattern adjustment is used.
reference_route_medians = {
    "BLR-BOM": (1239, 2201), "BLR-DEL": (1600, 4500),
    "BOM-BLR": (1239, 2124), "BOM-DEL": (2578, 2464),
    "BOM-HYD": (567, 2901), "BOM-MAA": (823, 3000),
    "CCU-DEL": (1195, 4001), "DEL-BLR": (1595, 4501),
    "DEL-BOM": (2592, 2700), "DEL-CCU": (1177, 4000),
    "DEL-HYD": (1010, 2516), "HYD-BOM": (553, 3096),
    "HYD-DEL": (981, 2696), "MAA-BOM": (824, 3000),
}
log_ratios = [math.log(median / c["routes"][route]["baseline"])
              for route, (_, median) in reference_route_medians.items()]
centre = statistics.median(log_ratios)
for route, (count, median) in reference_route_medians.items():
    relative = math.exp(0.35 * (math.log(median / c["routes"][route]["baseline"]) - centre))
    c["routes"][route]["baseline"] = round(c["routes"][route]["baseline"] * min(1.25, max(0.8, relative)) / 50) * 50
c["reference_calibration"] = {
    "input": "User-provided Freshly_cleaned.csv; transformed 2022-era flight option dataset",
    "filter": "Economy, zero stops, directional route overlap",
    "matching_rows": sum(n for n, _ in reference_route_medians.values()),
    "matched_routes": len(reference_route_medians),
    "method": "35% log-relative route-median correction around the reference centre; cap 0.80–1.25; no absolute 2022 fare level carried forward",
    "cannot_calibrate": "Daily fare movement, booking lead time, current airline schedules, current prices, government index accuracy",
    "source_status": "User-supplied transformed file; original data lineage and reuse terms not independently verified",
}

# Average eight services per route. The pair ranking follows published
# September 2026 scheduled-capacity ordering, but counts/times are assumptions.
pair_services = (12, 10, 10, 9, 9, 8, 8, 8, 7, 6, 4, 5)
bands = (
    ((6, 20), (7, 30), (8, 25)),
    ((11, 45), (13, 25), (15, 10)),
    ((17, 35), (18, 45), (20, 10)),
    ((21, 20), (22, 10), (23, 5)),
)
time_factors = ((1.05, 1.04, 1.02), (0.98, 1.0, 0.99),
                (1.07, 1.05, 1.03), (0.94, 0.93, 0.92))
carriers = ("6E", "AI", "IX", "QP", "SG")
services = []
rosters = {}
for route_index, route in enumerate(c["routes"]):
    # Core carriers plus rotating alternatives; no forced five-carrier coverage.
    alternatives = ("IX", "QP", "SG")
    roster = ("6E", "AI", alternatives[route_index % 3], alternatives[(route_index + 1) % 3])
    pattern = ("6E", "AI", roster[2], "6E", "AI", roster[3],
               "6E", roster[2], "AI", roster[3], "6E", roster[2])
    assigned = pattern[:pair_services[route_index // 2]]
    rosters[route] = sorted(set(assigned))
    for slot, airline in enumerate(assigned):
        band, position = slot % 4, slot // 4
        hour, minute = bands[band][position]
        # Small route offsets avoid copying identical clock times to every route.
        minute = (minute + (route_index * 3 + position * 2) % 10) % 60
        services.append({
            "route": route,
            "airline": airline,
            "flight_number": f"SIM-{airline}-{2000 + route_index * 12 + slot}",
            "local_time": f"{hour:02d}:{minute:02d}",
            "time_factor": time_factors[band][position],
        })
c["services"] = services
c["operating_airlines_by_route"] = rosters
assert len(services) == 192 and set(c["airlines"]) == set(carriers)

profiles = c["market_behaviour"]["airline_profiles"]
profiles["6E"]["hold_probability"] = 0.22
profiles["AI"]["hold_probability"] = 0.46
profiles["IX"]["hold_probability"] = 0.28
profiles["QP"]["hold_probability"] = 0.20
profiles["SG"]["hold_probability"] = 0.24

# Calendar dates have public references; scope and fare effects remain assumptions.
all_routes = list(c["routes"])
pat_outbound = [r for r in all_routes if r.endswith("-PAT")]
pat_return = [r for r in all_routes if r.startswith("PAT-")]
goa_outbound = [r for r in all_routes if r.endswith("-GOI")]
goa_return = [r for r in all_routes if r.startswith("GOI-")]
def event(name, day, routes, before, after, multiplier, source):
    return dict(name=name, date=day, routes=routes, pre_days=before,
                post_days=after, multiplier=multiplier, date_source=source,
                effect_provenance="ENGINEERING_ASSUMPTION")

c["events"] = [
    event("Diwali 2024", "2024-10-31", all_routes, 4, 2, 1.13, "NHAI2024"),
    event("Chhath outbound 2024", "2024-11-07", pat_outbound, 6, 0, 1.27, "NHAI2024"),
    event("Chhath return 2024", "2024-11-07", pat_return, 0, 5, 1.23, "NHAI2024"),
    event("Christmas Goa outbound 2024", "2024-12-25", goa_outbound, 5, 1, 1.25, "NHAI2024"),
    event("Christmas Goa return 2024", "2024-12-25", goa_return, 0, 5, 1.21, "NHAI2024"),
    event("Holi travel 2025", "2025-03-14", pat_outbound + ["CCU-DEL", "BLR-DEL"], 4, 2, 1.16, "SCENARIO_DATE_ASSUMPTION"),
    event("Diwali 2025", "2025-10-20", all_routes, 4, 2, 1.14, "CAL2025"),
    event("Chhath outbound 2025", "2025-10-27", pat_outbound, 6, 0, 1.29, "WB2025"),
    event("Chhath return 2025", "2025-10-27", pat_return, 0, 5, 1.25, "WB2025"),
    event("Christmas Goa outbound 2025", "2025-12-25", goa_outbound, 5, 1, 1.26, "CAL2025"),
    event("Christmas Goa return 2025", "2025-12-25", goa_return, 0, 5, 1.22, "CAL2025"),
    event("Republic Day 2026", "2026-01-26", all_routes, 2, 1, 1.09, "CAL2026"),
    event("Holi travel 2026", "2026-03-04", pat_outbound + ["CCU-DEL", "BLR-DEL"], 4, 2, 1.17, "CAL2026"),
    event("Independence Day 2026", "2026-08-15", all_routes, 2, 1, 1.09, "CAL2026"),
    event("Dussehra 2026", "2026-10-20", ["CCU-DEL", "BLR-DEL", "DEL-HYD"], 4, 2, 1.17, "CAL2026"),
    event("Diwali 2026", "2026-11-08", all_routes, 4, 2, 1.14, "IIRS2026"),
    event("Chhath outbound 2026", "2026-11-15", pat_outbound, 6, 0, 1.29, "PUNJAB2026"),
    event("Chhath return 2026", "2026-11-15", pat_return, 0, 5, 1.25, "PUNJAB2026"),
]

validate(c)
target = HERE / "config/final-synthetic.json"
target.write_text(json.dumps(c, indent=2) + "\n")
print(f"{target}: {len(c['routes'])} routes, {len(services)} services, "
      f"{c['days']} collection days, {len(c['horizons'])} horizons, "
      f"{c['days'] * len(services) * len(c['horizons']):,} results")
