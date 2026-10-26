"""Stratified, dependency-free plausibility audit of the final synthetic scenario."""
import argparse
import json
import statistics
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

from simulator import event_factor, flight_history, validate


def band(hour):
    return "early_morning" if hour < 9 else "daytime" if hour < 17 else "evening" if hour < 21 else "night"


def audit(config):
    validate(config)
    services = config["services"]
    routes = config["routes"]
    coverage = defaultdict(Counter)
    airlines = Counter()
    for service in services:
        coverage[service["route"]][band(int(service["local_time"][:2]))] += 1
        airlines[service["airline"]] += 1
    expected_bands = {"early_morning", "daytime", "evening", "night"}
    assert len(routes) == 24 and len(services) == 192 and len(airlines) == 5
    assert all(set(bands) == expected_bands for bands in coverage.values())

    departure_dates = [date.fromisoformat(day) for day in (
        "2024-11-07", "2025-01-15", "2025-04-15", "2025-07-15",
        "2025-10-27", "2026-01-15", "2026-04-15", "2026-07-15",
        "2026-10-05",
    )]
    outcomes = Counter()
    moves = defaultdict(Counter)
    fares = defaultdict(list)
    lead_fares = defaultdict(list)
    ceiling = 0
    pairs = 0
    longest_hold = 0
    signature_counts = Counter()
    for service in services:
        for departure in departure_dates:
            history = flight_history(config, service, departure)
            signature_counts[tuple(history[h]["total_paise"] for h in range(45, 0, -1))] += 1
            run = 0
            for horizon in range(45, 0, -1):
                row = history[horizon]
                outcomes[row["outcome"]] += 1
                if row["total_paise"] is not None:
                    fare = row["total_paise"] / 100
                    fares[service["route"]].append(fare)
                    lead_fares[horizon].append(fare)
                    ceiling += fare == config["price_bounds"][1]
                if horizon < 45:
                    previous = history[horizon + 1]
                    if row["total_paise"] is not None and previous["total_paise"] is not None:
                        pairs += 1
                        delta = row["total_paise"] - previous["total_paise"]
                        moves[service["airline"]]["up" if delta > 0 else "down" if delta < 0 else "same"] += 1
                        run = run + 1 if delta == 0 else 0
                        longest_hold = max(longest_hold, run)
    assert pairs > 20000 and len(fares) == 24
    assert all(sum(changes.values()) > 100 for changes in moves.values())
    assert all(changes["up"] and changes["down"] and changes["same"] for changes in moves.values())
    assert max(signature_counts.values()) == 1, "Two flight histories are identical in the audit sample"
    festival = date.fromisoformat("2025-10-27")
    inbound_effect = event_factor(config, "DEL-PAT", festival)[0]
    outbound_effect = event_factor(config, "PAT-DEL", festival)[0]
    assert inbound_effect > outbound_effect
    assert event_factor(config, "DEL-PAT", festival - timedelta(days=3))[0] > event_factor(config, "PAT-DEL", festival - timedelta(days=3))[0]
    assert event_factor(config, "PAT-DEL", festival + timedelta(days=3))[0] > event_factor(config, "DEL-PAT", festival + timedelta(days=3))[0]
    return {
        "data_mode": "SIMULATED",
        "validation_type": "PLAUSIBILITY_AUDIT_NOT_REAL_MARKET_ACCURACY",
        "routes": len(routes), "airlines": dict(airlines), "daily_services": len(services),
        "services_per_route": {route: sum(bands.values()) for route, bands in coverage.items()},
        "departure_time_coverage": {route: dict(bands) for route, bands in coverage.items()},
        "sampled_departure_dates": [str(day) for day in departure_dates],
        "sampled_results": sum(outcomes.values()), "outcomes": dict(outcomes),
        "consecutive_available_pairs": pairs, "price_moves_by_airline": {k: dict(v) for k, v in moves.items()},
        "longest_unchanged_run": longest_hold, "price_ceiling_hits": ceiling,
        "sampled_route_medians_inr": {route: round(statistics.median(values)) for route, values in fares.items()},
        "identical_histories": sum(n - 1 for n in signature_counts.values()),
        "median_available_fare_by_booking_horizon_inr": {
            str(h): round(statistics.median(lead_fares[h])) for h in (1, 7, 21, 30, 45)
        },
        "chhath_2025_inbound_outbound_factors": {"DEL-PAT": inbound_effect, "PAT-DEL": outbound_effect},
        "real_market_accuracy": None,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/final-synthetic.json")
    parser.add_argument("--output")
    args = parser.parse_args()
    result = audit(json.loads(Path(args.config).read_text()))
    if args.output:
        Path(args.output).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
