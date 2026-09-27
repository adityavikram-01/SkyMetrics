#!/usr/bin/env python3
"""Export a connected, account-free slice of the local simulated airfare data."""

import argparse
import datetime as dt
import gzip
import os
import pathlib
import re
import shutil
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]


def local_env(path):
    values = {}
    for line in path.read_text().splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", default="2026-09-13")
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--output", type=pathlib.Path, default=ROOT / "review-snapshot.sql.gz")
    args = parser.parse_args()
    if args.days < 90:
        parser.error("At least 90 days are needed for the route analysis")

    config = local_env(ROOT / "apix-backend" / ".env")
    url = config.get("DB_URL", "")
    match = re.match(r"jdbc:mysql://([^:/?]+)(?::(\d+))?/([^?]+)", url)
    if not match:
        parser.error("DB_URL in apix-backend/.env must be a jdbc:mysql URL")
    host, port, database = match.group(1), match.group(2) or "3306", match.group(3)
    as_of = dt.date.fromisoformat(args.as_of)
    cutoff = as_of - dt.timedelta(days=args.days)
    date_filter = f"collection_date BETWEEN '{cutoff}' AND '{as_of}'"
    run_ids = f"SELECT id FROM collection_run WHERE {date_filter}"
    # Retain one real generated service per route, airline and departure-time band.
    # Keeping the same services on every day preserves longitudinal comparisons.
    services = ("SELECT MIN(fs.id) FROM flight_service fs JOIN flight_departure fd "
                "ON fd.service_id=fs.id GROUP BY fs.route_id,fs.airline_id,fd.time_band")
    departures = f"SELECT id FROM flight_departure WHERE service_id IN ({services})"
    result_filter = f"run_id IN ({run_ids}) AND departure_id IN ({departures})"
    result_ids = f"SELECT id FROM collection_result WHERE {result_filter}"

    tables = [
        ("airport", None), ("airline", None), ("data_source", None),
        ("dataset", None), ("route", None), ("fare_product", None),
        ("flight_service", None),
        ("flight_departure", f"id IN (SELECT departure_id FROM collection_result WHERE {result_filter})"),
        ("calendar_event", None),
        ("collection_run", date_filter),
        ("collection_result", result_filter),
        ("fare_observation", f"result_id IN ({result_ids})"),
        ("simulation_inventory_state", f"result_id IN ({result_ids})"),
    ]
    env = os.environ.copy()
    env["MYSQL_PWD"] = config.get("DB_PASSWORD", "")
    mysql_dump = shutil.which("mysqldump") or "/usr/local/mysql/bin/mysqldump"
    common = [mysql_dump, "--host", host, "--port", port, "--user", config.get("DB_USERNAME", ""),
              "--single-transaction", "--skip-lock-tables", "--quick", "--no-create-info",
              "--skip-triggers", "--no-tablespaces", "--set-gtid-purged=OFF",
              "--column-statistics=0", "--complete-insert", "--hex-blob"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(args.output, "wb", compresslevel=6) as output:
        output.write(b"SET FOREIGN_KEY_CHECKS=0;\n")
        for table, condition in tables:
            print(f"Exporting {table}...", flush=True)
            command = common.copy()
            if condition:
                command.append("--where=" + condition)
            command.extend([database, table])
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
            shutil.copyfileobj(process.stdout, output)
            error = process.stderr.read().decode(errors="replace")
            if process.wait() != 0:
                args.output.unlink(missing_ok=True)
                raise RuntimeError(f"Export failed for {table}: {error}")
        output.write(("UPDATE collection_run r SET result_count=(SELECT COUNT(*) FROM "
                      "collection_result cr WHERE cr.run_id=r.id) WHERE " + date_filter + ";\n").encode())
        output.write(b"SET FOREIGN_KEY_CHECKS=1;\n")
    print(f"Created {args.output} ({args.output.stat().st_size / 1024**2:.1f} MiB)")
    print("Contains only simulated fare data. User accounts and passwords are excluded.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
