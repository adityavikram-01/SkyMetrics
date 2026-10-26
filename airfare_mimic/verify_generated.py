"""Verify a generated synthetic dataset without loading every row into RAM."""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path


def verify(root):
    root = Path(root)
    manifest = json.loads((root / "manifest.json").read_text())
    config = json.loads((root / "config.json").read_text())
    encoded = json.dumps(config, sort_keys=True, separators=(",", ":"), allow_nan=False)
    assert hashlib.sha256(encoded.encode()).hexdigest() == manifest["config_hash"]
    assert manifest["is_synthetic"] is True
    db = sqlite3.connect(f"file:{root / 'airfare.sqlite'}?mode=ro", uri=True)
    db.execute("PRAGMA query_only=ON")
    def scalar(query):
        return db.execute(query).fetchone()[0]

    runs = scalar("SELECT COUNT(*) FROM collection_run")
    services = scalar("SELECT COUNT(*) FROM flight_service")
    results = scalar("SELECT COUNT(*) FROM collection_result")
    available = scalar("SELECT COUNT(*) FROM collection_result WHERE outcome='AVAILABLE'")
    fares = scalar("SELECT COUNT(*) FROM fare_observation WHERE total_paise IS NOT NULL")
    assert runs == manifest["runs"] == config["days"]
    assert services == manifest["services"] == len(config["services"])
    assert results == manifest["expected_results"] == runs * services * len(config["horizons"])
    assert fares == available
    assert scalar("SELECT COUNT(*) FROM fare_observation WHERE is_synthetic<>1 OR currency<>'INR'") == 0
    assert scalar("SELECT COUNT(*) FROM fare_observation WHERE total_paise<=0") == 0
    assert scalar("SELECT COUNT(*) FROM collection_result WHERE horizon NOT BETWEEN 1 AND 45") == 0
    assert scalar("SELECT COUNT(DISTINCT route) FROM flight_service") == len(config["routes"])
    assert scalar("SELECT COUNT(DISTINCT airline) FROM flight_service") == len(config["airlines"])
    start, end = db.execute("SELECT MIN(collection_date), MAX(collection_date) FROM collection_run").fetchone()
    assert (start, end) == (manifest["collection_start"], manifest["collection_end"])
    for outcome, count in db.execute("SELECT outcome, COUNT(*) FROM collection_result GROUP BY outcome"):
        assert manifest["outcomes"][outcome] == count
    assert not db.execute("PRAGMA foreign_key_check").fetchone()
    low, high = db.execute("SELECT MIN(total_paise), MAX(total_paise) FROM fare_observation WHERE total_paise IS NOT NULL").fetchone()
    db.close()
    return {"data_mode": "SIMULATED", "validation": "STRUCTURAL_AND_PLAUSIBILITY_ONLY",
            "collection_days": runs, "daily_services": services, "routes": len(config["routes"]),
            "airlines": len(config["airlines"]), "booking_horizons": len(config["horizons"]),
            "collection_results": results, "available_fares": fares,
            "available_fare_range_inr": [low / 100, high / 100],
            "collection_start": start, "collection_end": end,
            "real_market_accuracy": None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("root")
    args = parser.parse_args()
    print(json.dumps(verify(args.root), indent=2))
