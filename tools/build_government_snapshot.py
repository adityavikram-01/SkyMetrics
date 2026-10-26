"""Build a compact, reproducible government read model from simulated SQLite rows."""
import argparse
import json
import math
import sqlite3
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path
from statistics import median


def rounded(value, places=2):
    return round(value, places) if value is not None else None


def build(source, config_path, manifest_path):
    cfg = json.loads(config_path.read_text())
    manifest = json.loads(manifest_path.read_text())
    db = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    assert db.execute("SELECT id FROM simulation_dataset").fetchone()[0] == manifest["dataset_id"]

    services = Counter(row[0] for row in db.execute("SELECT route FROM flight_service"))
    daily_cells = defaultdict(lambda: defaultdict(list))
    route_fares = defaultdict(lambda: defaultdict(list))
    airline_time = defaultdict(lambda: defaultdict(list))
    seasonality = defaultdict(lambda: defaultdict(list))
    # One fixed fare product, exactly 21 days before the dated departure.
    sql = """SELECT run.collection_date,service.route,service.airline,service.local_time,
                    fare.total_paise
             FROM collection_result result
             JOIN collection_run run ON run.id=result.run_id
             JOIN flight_departure departure ON departure.id=result.flight_id
             JOIN flight_service service ON service.id=departure.service_id
             JOIN fare_observation fare ON fare.result_id=result.id
             WHERE result.horizon=21 AND result.outcome='AVAILABLE'
             ORDER BY run.collection_date"""
    last = manifest["collection_end"]
    recent_start = (date.fromisoformat(last) - timedelta(days=29)).isoformat()
    for row in db.execute(sql):
        collection_day, route, airline, local_time, paise = row
        hour = int(local_time[:2])
        band = "Morning" if hour < 12 else "Afternoon" if hour < 17 else "Evening" if hour < 21 else "Night"
        cell = f"{route}|{airline}|{band}"
        rupees = paise / 100
        daily_cells[collection_day][cell].append(rupees)
        route_fares[collection_day][route].append(rupees)
        travel_day = date.fromisoformat(collection_day) + timedelta(days=21)
        seasonality[route][("weekend" if travel_day.weekday() >= 5 else "weekday")].append(rupees)
        seasonality[route][f"month-{travel_day.month:02d}"].append(rupees)
        if collection_day >= recent_start:
            airline_time[route][(airline, band)].append(rupees)
    days = sorted(daily_cells)
    assert len(days) == manifest["runs"]
    cell_medians = {day: {cell: median(values) for cell, values in cells.items()}
                    for day, cells in daily_cells.items()}
    # A strictly complete two-year intersection is too small because a genuine
    # unavailable outcome removes its quote. Retain stable cells observed on at
    # least 96% of dates, then carry forward their last observed quote for a
    # maximum of three days. Never count carried quotes as fresh observations.
    fixed = set()
    for cell in cell_medians[days[0]]:
        observed = [day for day in days if cell in cell_medians[day]]
        if len(observed) < int(len(days) * .96):
            continue
        gap = longest = 0
        for day in days:
            gap = 0 if cell in cell_medians[day] else gap + 1
            longest = max(longest, gap)
        if longest <= 3:
            fixed.add(cell)
    assert len(fixed) >= 20, "Fixed fare basket has inadequate coverage"
    filled = {}
    last_seen = {}
    last_fresh = {}
    carried_count = {}
    cell_evidence = {}
    for day in days:
        today = dict(cell_medians[day])
        carried = 0
        evidence = []
        for cell in fixed:
            fresh = daily_cells[day].get(cell, [])
            if not fresh:
                today[cell] = last_seen[cell]
                carried += 1
            else:
                last_fresh[cell] = day
            last_seen[cell] = today[cell]
            age = (date.fromisoformat(day) - date.fromisoformat(last_fresh[cell])).days
            evidence.append([cell, rounded(today[cell]), len(fresh), age,
                             rounded(min(fresh)) if fresh else None,
                             rounded(max(fresh)) if fresh else None])
        filled[day] = today
        carried_count[day] = carried
        cell_evidence[day] = sorted(evidence)
    cell_medians = filled
    by_route = defaultdict(list)
    for cell in sorted(fixed):
        by_route[cell.split("|")[0]].append(cell)
    assert len(by_route) == len(services), "A directional route is missing from the basket"
    base = cell_medians[days[0]]
    total_weight = sum(services[route] for route in by_route)
    series = []
    for day in days:
        cells = cell_medians[day]
        route_index = {}
        for route, keys in by_route.items():
            route_index[route] = 100 * math.exp(sum(math.log(cells[key] / base[key]) for key in keys) / len(keys))
        index = sum(route_index[route] * services[route] for route in by_route) / total_weight
        series.append({"date": day, "index": rounded(index),
                       "routes": {route: rounded(value) for route, value in sorted(route_index.items())},
                       "available21DayQuotes": sum(len(values) for values in daily_cells[day].values()),
                       "carriedCells": carried_count[day]})

    outcomes = defaultdict(Counter)
    for row in db.execute("""SELECT run.collection_date,result.outcome,COUNT(*)
                             FROM collection_result result JOIN collection_run run ON run.id=result.run_id
                             GROUP BY run.collection_date,result.outcome"""):
        outcomes[row[0]][row[1]] = row[2]
    quality = []
    observed_at = dict(db.execute("SELECT collection_date,observed_at FROM collection_run"))
    route_outcomes = defaultdict(lambda: defaultdict(Counter))
    for day, route, outcome, count in db.execute("""SELECT run.collection_date,service.route,result.outcome,COUNT(*)
        FROM collection_result result JOIN collection_run run ON run.id=result.run_id
        JOIN flight_departure departure ON departure.id=result.flight_id
        JOIN flight_service service ON service.id=departure.service_id
        GROUP BY run.collection_date,service.route,result.outcome"""):
        route_outcomes[day][route][outcome] = count
    route_quality = {}
    for day in days:
        route_quality[day] = {route: {"attempted": sum(counts.values()),
            "available": counts["AVAILABLE"],
            "unavailable": counts["SOLD_OUT"] + counts["NO_OFFER"],
            "collectionFailures": sum(counts[key] for key in ("TIMEOUT", "SOURCE_BLOCKED", "PARSE_ERROR", "RATE_LIMITED"))}
            for route, counts in sorted(route_outcomes[day].items())}
    for day in days:
        counts = outcomes[day]
        quality.append({"date": day, "attempted": sum(counts.values()),
                        "available": counts["AVAILABLE"], "unavailable": counts["SOLD_OUT"] + counts["NO_OFFER"],
                        "collectionFailures": sum(counts[key] for key in ("TIMEOUT", "SOURCE_BLOCKED", "PARSE_ERROR", "RATE_LIMITED")),
                        "outcomes": dict(sorted(counts.items())), "simulatedObservedAt": observed_at[day]})

    # Candidate anomalies are audited, not silently excluded from the index.
    anomaly_counts = {}
    for day_number, day in enumerate(days):
        flagged = 0
        for cell in fixed:
            history = [cell_medians[prior][cell] for prior in days[max(0, day_number - 28):day_number]
                       if cell in daily_cells[prior]]
            if len(history) >= 14 and cell in daily_cells[day]:
                reference = median(history)
                if reference and abs(math.log(cell_medians[day][cell] / reference)) > math.log(1.8):
                    flagged += 1
        anomaly_counts[day] = flagged
    for row in quality:
        row["candidateAnomalies"] = anomaly_counts[row["date"]]

    # Comparable completed departures sampled at six booking horizons.
    cohort_end = date.fromisoformat(last)
    cohort_start = (cohort_end - timedelta(days=44)).isoformat()
    horizons = (1, 7, 14, 21, 30, 45)
    lead_flights = defaultdict(lambda: defaultdict(dict))
    query = """SELECT service.route,departure.id,result.horizon,fare.total_paise
               FROM collection_result result
               JOIN flight_departure departure ON departure.id=result.flight_id
               JOIN flight_service service ON service.id=departure.service_id
               JOIN fare_observation fare ON fare.result_id=result.id
               WHERE result.outcome='AVAILABLE' AND result.horizon IN (1,7,14,21,30,45)
                 AND substr(departure.departure_at,1,10) BETWEEN ? AND ?"""
    for route, departure_id, horizon, paise in db.execute(query, (cohort_start, cohort_end.isoformat())):
        lead_flights[route][departure_id][horizon] = paise / 100
    lead_report = {}
    for route in sorted(services):
        matched = [prices for prices in lead_flights[route].values()
                   if all(horizon in prices for horizon in horizons)]
        lead_report[route] = [{"daysBeforeDeparture": horizon,
                               "median": rounded(median(prices[horizon] for prices in matched)) if matched else None,
                               "observations": len(matched), "matchedDepartures": len(matched)}
                              for horizon in horizons]

    airline_report = {route: [{"airline": airline, "timeBand": band,
                               "median": rounded(median(values)), "observations": len(values)}
                              for (airline, band), values in sorted(groups.items())]
                      for route, groups in sorted(airline_time.items())}
    seasonal_report = {route: [{"period": period, "median": rounded(median(values)),
                                  "observations": len(values)}
                                 for period, values in sorted(groups.items())]
                       for route, groups in sorted(seasonality.items())}
    events = []
    for event in cfg["events"]:
        d = date.fromisoformat(event["date"])
        start = d - timedelta(days=event["pre_days"])
        end = d + timedelta(days=event["post_days"])
        if end > cohort_end or start < date.fromisoformat(days[0]) + timedelta(days=21):
            continue
        for route in event["routes"]:
            affected = []
            prior = []
            for travel in (start + timedelta(days=i) for i in range((end - start).days + 1)):
                quoted = (travel - timedelta(days=21)).isoformat()
                affected.extend(route_fares[quoted].get(route, []))
            for travel in (start - timedelta(days=i) for i in range(1, 8)):
                quoted = (travel - timedelta(days=21)).isoformat()
                prior.extend(route_fares[quoted].get(route, []))
            if len(affected) >= 3 and len(prior) >= 3:
                events.append({"event": event["name"], "date": event["date"], "route": route,
                               "median": rounded(median(affected)), "priorMedian": rounded(median(prior)),
                               "differencePercent": rounded(100 * (median(affected) / median(prior) - 1)),
                               "observations": len(affected), "priorObservations": len(prior),
                               "dateSource": event.get("date_source", "Scenario calendar")})
    events.sort(key=lambda item: (item["date"], item["route"]))
    return {"dataMode": "SIMULATED", "status": "RESEARCH_PROTOTYPE", "datasetId": manifest["dataset_id"],
            "modelVersion": manifest["model_version"], "configHash": manifest["config_hash"],
            "generatedFrom": "airfare.sqlite", "firstCollectionDate": days[0], "lastCollectionDate": days[-1],
            "baseDate": days[0], "baseIndex": 100, "fixedMatchedCells": len(fixed), "maxCarryForwardDays": 3,
            "basketRoutes": len(services), "serviceCounts": dict(sorted(services.items())),
            "matchedCellsByRoute": {route: len(keys) for route, keys in sorted(by_route.items())},
            "series": series, "quality": quality, "routeQuality": route_quality,
            "cellEvidence": cell_evidence,
            "leadTime": lead_report, "airlineTime": airline_report,
            "seasonality": seasonal_report, "events": events,
            "methodology": {"fareProduct": "Simulated one-adult, one-way, nonstop economy INR total; no real offers",
                            "index": "Fixed route-airline-departure-band basket observed on at least 96% of dates; exact 21-day booking horizon; missing quotes carried forward up to 3 days and disclosed",
                            "aggregation": "Geometric mean of cell price relatives per directional route; arithmetic route average weighted by assumed daily service count",
                            "base": "First collection date = 100; same base across all 730 dates",
                            "exclusions": "Only AVAILABLE simulated INR fares enter fare medians. SOLD_OUT, NO_OFFER and simulated failures are excluded from price calculations but retained in the quality audit. Basket cells lacking a fresh quote use the last observed median for at most 3 days; longer gaps would fail basket selection.",
                            "leadTime": "Median available fares at 1, 7, 14, 21, 30 and 45 days before the same completed simulated departures in the last 45-day cohort; only departures with all six horizons are included",
                            "event": "Affected travel-date 21-day quotes compared with the preceding 7 travel dates; descriptive scenario, not a causal estimate",
                            "quality": "One simulated generator is the sole source. Candidate anomalies are fresh matched-cell medians more than 80% above or below the trailing 28-date median (minimum 14 dates); they are flagged, not excluded. Research index requires all 24 routes, at least 90% available attempts, and no more than 5% carried basket cells. Simulation is never eligible as an official published index.",
                            "limitations": "No live fares, verified schedules, passenger weights, official CPI status, real collection failures or validated forecast accuracy"}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = build(args.source, args.config, args.manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",", ":")))
    print(f"snapshot: {len(result['series'])} days, {result['basketRoutes']} routes, {result['fixedMatchedCells']} matched cells")


if __name__ == "__main__":
    main()
