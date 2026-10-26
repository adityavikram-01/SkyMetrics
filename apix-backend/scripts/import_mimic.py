"""Replay existing synthetic SQLite data as atomic, idempotent daily JSON requests."""
import argparse, hashlib, json, sqlite3, time, urllib.request, urllib.error
from pathlib import Path

p = argparse.ArgumentParser();
p.add_argument('--input', default='../airfare_mimic/output/year');
p.add_argument('--url', default='http://127.0.0.1:8080');
p.add_argument('--limit', type=int);
p.add_argument('--start-date');
a = p.parse_args()
root = Path(a.input);
cfg = json.loads((root / 'config.json').read_text());
manifest = json.loads((root / 'manifest.json').read_text());
canonical = json.dumps(cfg, sort_keys=True, separators=(',', ':'), allow_nan=False)
assert hashlib.sha256(canonical.encode()).hexdigest() == manifest['config_hash']


def post(path, obj, key=None):
    body = json.dumps(obj, separators=(',', ':'), allow_nan=False).encode();
    headers = {'Content-Type': 'application/json'}
    if key: headers['Idempotency-Key'] = key
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(a.url + path, data=body, headers=headers),
                                        timeout=180) as response:
                return json.load(response)
        except urllib.error.HTTPError as e:
            raise SystemExit(f'HTTP {e.code}: {e.read().decode()}')
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2: raise
            time.sleep(1)


print(post('/api/v1/ingestion/datasets', dict(externalId=manifest['dataset_id'], modelVersion=manifest['model_version'],
                                              configHash=manifest['config_hash'], canonicalConfig=canonical,
                                              synthetic=True)), flush=True)
db = sqlite3.connect(f'file:{root / "airfare.sqlite"}?mode=ro', uri=True);
db.row_factory = sqlite3.Row
query = '''SELECT r.id result_id,
                  r.horizon,
                  r.outcome,
                  d.id flight_id,
                  d.service_id,
                  d.departure_at,
                  d.arrival_at,
                  s.route,
                  s.airline,
                  s.flight_number,
                  f.total_paise,
                  i.remaining,
                  i.arrivals,
                  i.cancellations
           FROM collection_result r
                    JOIN flight_departure d ON d.id = r.flight_id
                    JOIN flight_service s ON s.id = d.service_id
                    LEFT JOIN fare_observation f ON f.result_id = r.id
                    JOIN simulation_inventory_state i ON i.result_id = r.id
           WHERE r.run_id = ?
           ORDER BY r.id'''
runs = list(db.execute('SELECT * FROM collection_run ORDER BY collection_date'))
if a.start_date: runs = [r for r in runs if r['collection_date'] >= a.start_date]
if a.limit: runs = runs[:a.limit]
for i, run in enumerate(runs, 1):
    rows = []
    for r in db.execute(query, (run['id'],)):
        # Convert UTC departure to local India date without guessing from UTC date.
        from datetime import datetime, timedelta, timezone

        dep_date = datetime.fromisoformat(r['departure_at']).astimezone(
            timezone(timedelta(hours=5, minutes=30))).date().isoformat()
        rows.append(dict(resultId=r['result_id'], serviceId=r['service_id'], flightId=r['flight_id'], route=r['route'],
                         airline=r['airline'], flightNumber=r['flight_number'], departureAt=r['departure_at'],
                         arrivalAt=r['arrival_at'], departureDate=dep_date, horizon=r['horizon'], outcome=r['outcome'],
                         totalPaise=r['total_paise'], latentRemaining=r['remaining'], latentArrivals=r['arrivals'],
                         latentCancellations=r['cancellations']))
    payload = dict(datasetId=manifest['dataset_id'], runId=run['id'], collectionDate=run['collection_date'],
                   observedAt=run['observed_at'], synthetic=True, results=rows)
    response = post('/api/v1/ingestion/runs', payload, run['id']);
    print(f"{i}/{len(runs)} {run['collection_date']} {response['status']} {response['resultCount']}", flush=True)
print('Import complete. datasetId=' + manifest['dataset_id'])
