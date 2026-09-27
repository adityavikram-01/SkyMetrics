"""Research-informed, explicitly synthetic market-behaviour layer.

It models qualitative demand patterns, never real airlines' confidential pricing.
"""
import hashlib
import json
import random
from datetime import timedelta


def _rng(seed, *parts):
    raw = json.dumps([seed, *parts], sort_keys=True, separators=(",", ":"))
    return random.Random(int(hashlib.sha256(raw.encode()).hexdigest(), 16))


def profile(config, route):
    behaviour = config.get("market_behaviour", {})
    name = behaviour.get("route_profiles", {}).get(route, "balanced")
    return name, behaviour.get("profiles", {}).get(name, {})


def weekday_multiplier(config, route, departure):
    factors = profile(config, route)[1].get("weekday_factors")
    return factors[departure.weekday()] if factors else 1.0


def seasonal_multiplier(config, route, departure):
    values = profile(config, route)[1]
    factors = values.get("monthly_factors")
    return factors[departure.month - 1] if factors else 1.0


def calendar_multiplier(config, route, departure):
    """Friday/Sunday and month-end salary-weekend signals, kept deliberately modest."""
    values = profile(config, route)[1]
    result = 1.0
    if departure.weekday() in (4, 6):
        result *= values.get("weekend_travel_multiplier", 1.0)
    if departure.day >= 25 or departure.day <= 2:
        result *= values.get("payday_multiplier", 1.0)
    return result


def late_multiplier(config, route):
    return profile(config, route)[1].get("late_multiplier", 1.0)


def shock_multiplier(config, route, airline):
    values = profile(config, route)[1]
    carrier = config.get("market_behaviour", {}).get("airline_profiles", {}).get(airline, {})
    return values.get("shock_multiplier", 1.0) * carrier.get("volatility_multiplier", 1.0)


def market_adjustment(config, route, airline, observed):
    """Five-day shared regimes create clusters instead of isolated random spikes."""
    behaviour = config.get("market_behaviour", {})
    if not behaviour:
        return 1.0, "normal"
    profile_name, values = profile(config, route)
    block = observed - timedelta(days=observed.toordinal() % 5)
    draw = _rng(config["seed"], "market-regime", route, block.isoformat())
    regime = draw.random()
    disruption_p = values.get("disruption_probability", 0.0)
    surge_p = values.get("surge_probability", 0.0)
    promotion_p = values.get("promotion_probability", 0.0)
    if regime < disruption_p:
        low, high = values["disruption_range"]
        return 1.0 + draw.uniform(low, high), f"{profile_name}_disruption"
    if regime < disruption_p + surge_p:
        low, high = values["surge_range"]
        return 1.0 + draw.uniform(low, high), f"{profile_name}_demand_surge"
    if regime < disruption_p + surge_p + promotion_p:
        carriers = sorted(config["airlines"])
        promoted = carriers[draw.randrange(len(carriers))]
        carrier = behaviour.get("airline_profiles", {}).get(airline, {})
        if airline == promoted:
            return 1.0 - carrier.get("promo_discount", 0.08), f"{profile_name}_carrier_promotion"
        return 1.0 - carrier.get("competitive_follow_discount", 0.02), f"{profile_name}_competitive_response"
    return 1.0, f"{profile_name}_normal"
