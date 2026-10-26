"""Research-informed, explicitly synthetic market-behaviour layer.

It models qualitative demand patterns, never real airlines' confidential pricing.
"""
import hashlib
import json
import random
from datetime import timedelta

_REGIME_CACHE = {}
_REGIME_OWNERS = {}


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
    """Shared multi-day regimes create clusters instead of isolated random spikes."""
    behaviour = config.get("market_behaviour", {})
    if not behaviour:
        return 1.0, "normal"
    if config.get("model_version") == "0.2.0":
        # Keep the config object alive so Python cannot recycle its id while
        # entries for it are still in the cache.
        _REGIME_OWNERS[id(config)] = config
        key = (id(config), route, airline, observed.toordinal())
        if key not in _REGIME_CACHE:
            if len(_REGIME_CACHE) >= 150000:
                _REGIME_CACHE.clear()
                _REGIME_OWNERS.clear()
                _REGIME_OWNERS[id(config)] = config
            _REGIME_CACHE[key] = _market_adjustment_v2(config, route, airline, observed)
        return _REGIME_CACHE[key]
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


def _market_adjustment_v2(config, route, airline, observed):
    """A route-wide event has a short rise, plateau and recovery.

    Promotions are assigned only to airlines in the assumed route schedule.
    All values are scenario assumptions, not measured airline behaviour.
    """
    behaviour = config["market_behaviour"]
    name, values = profile(config, route)
    period = 9
    start = observed.toordinal() - observed.toordinal() % period
    age = observed.toordinal() - start
    envelope = (0.35, 0.7, 1.0, 1.0, 0.8, 0.55, 0.3, 0.0, 0.0)[age]
    draw = _rng(config["seed"], "regime-v2", route, start)
    threshold = draw.random()
    disruption = values.get("disruption_probability", 0.0)
    surge = values.get("surge_probability", 0.0)
    promotion = values.get("promotion_probability", 0.0)
    if threshold < disruption:
        low, high = values["disruption_range"]
        return 1 + envelope * draw.uniform(low, high), f"{name}_disruption"
    if threshold < disruption + surge:
        low, high = values["surge_range"]
        return 1 + envelope * draw.uniform(low, high), f"{name}_demand_surge"
    if threshold < disruption + surge + promotion:
        operating = config["operating_airlines_by_route"][route]
        promoted = operating[draw.randrange(len(operating))]
        carrier = behaviour.get("airline_profiles", {}).get(airline, {})
        discount = carrier.get("promo_discount", 0.08) if airline == promoted else carrier.get("competitive_follow_discount", 0.02)
        state = "carrier_promotion" if airline == promoted else "competitive_response"
        return 1 - envelope * discount, f"{name}_{state}"
    return 1.0, f"{name}_normal"
