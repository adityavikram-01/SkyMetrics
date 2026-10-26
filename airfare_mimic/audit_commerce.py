"""Read-only acceptance checks for generated commerce datasets."""
import argparse,json,sqlite3,time
from datetime import date
from pathlib import Path

def audit(path):
    path=Path(path);db=sqlite3.connect(f'file:{path}?mode=ro',uri=True)
    db.row_factory=sqlite3.Row
    def scalar(sql,args=()):return db.execute(sql,args).fetchone()[0]
    start=time.monotonic()
    config=json.loads(scalar('SELECT config_json FROM dataset'))
    expected=config['days']*60*len(config['services'])
    checks={
      '48_routes':scalar('SELECT count(*) FROM route')==48,
      'expected_observations':scalar('SELECT count(*) FROM observation')==expected,
      'valid_arrival_times':scalar('SELECT count(*) FROM departure WHERE arrival_utc_minute<=departure_utc_minute')==0,
      'inventory_within_capacity':scalar('SELECT count(*) FROM observation o JOIN departure d ON d.id=o.departure_id JOIN service s ON s.id=d.service_id WHERE o.remaining_inventory>s.capacity')==0,
      'all_outcomes_covered':scalar('SELECT count(DISTINCT outcome) FROM observation')==6,
      'no_fake_review_counts':scalar('SELECT count(*) FROM service_rating WHERE review_count IS NOT NULL')==0,
      'no_orphan_rows':db.execute('PRAGMA foreign_key_check').fetchone() is None,
    }
    day=scalar('SELECT max(search_day) FROM observation')
    target=str(date.fromordinal(day+21))
    query='''SELECT s.route,count(*) AS options,count(DISTINCT s.airline) AS airlines
       FROM observation o JOIN departure d ON d.id=o.departure_id JOIN service s ON s.id=d.service_id
       WHERE o.search_day=? AND d.travel_date=? AND o.outcome='AVAILABLE' GROUP BY s.route'''
    t=time.monotonic();coverage=[dict(r) for r in db.execute(query,(day,target))];latency=time.monotonic()-t
    checks['every_route_searchable_at_21_days']=len(coverage)==48
    # A concrete same-airport self-transfer candidate with 2..6-hour gap, <=12-hour total.
    connections=scalar('''SELECT count(*) FROM departure a JOIN service sa ON sa.id=a.service_id
      JOIN route ra ON ra.code=sa.route JOIN route rb ON rb.origin=ra.destination
      JOIN service sb ON sb.route=rb.code JOIN departure b ON b.service_id=sb.id
      JOIN observation oa ON oa.departure_id=a.id AND oa.search_day=?
      JOIN observation ob ON ob.departure_id=b.id AND ob.search_day=oa.search_day
      WHERE ra.origin='BOM' AND rb.destination='DEL' AND a.travel_date=?
      AND b.travel_date BETWEEN ? AND date(?,'+1 day')
      AND b.departure_utc_minute-a.arrival_utc_minute BETWEEN 120 AND 360
      AND b.arrival_utc_minute-a.departure_utc_minute<=720
      AND oa.outcome='AVAILABLE' AND ob.outcome='AVAILABLE' ''',(day,target,target,target))
    checks['valid_connection_candidates']=connections>0
    outcome={r[0]:r[1] for r in db.execute('SELECT outcome,count(*) FROM observation GROUP BY outcome')}
    result={'checks':checks,'passed':all(checks.values()),'outcomes':outcome,
      'search_options_per_route':coverage,'bom_del_valid_self_transfer_candidates':connections,
      'search_seconds':round(latency,3),'database_bytes':path.stat().st_size,
      'full_730_day_size_estimate_bytes':round(path.stat().st_size*730/config['days']),
      'audit_seconds':round(time.monotonic()-start,2),
      'limitations':['Connections require separate tickets; no through-ticket or transfer protection is implied.',
         'No backend/frontend activation or real-market validation is certified by this audit.']}
    db.close();return result

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('database');p.add_argument('--out',required=True);a=p.parse_args()
    result=audit(a.database);Path(a.out).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='search_options_per_route'},indent=2))
    if not result['passed']:raise SystemExit(1)
