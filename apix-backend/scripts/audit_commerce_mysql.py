"""Cross-store fidelity checks and measured query plans for the local import."""
import argparse,datetime,json,sqlite3,time
from pathlib import Path
from import_commerce_mysql import mysql

def audit(source,container,out):
 db=sqlite3.connect(f'file:{Path(source).resolve()}?mode=ro',uri=True)
 checks={}
 sq="SELECT outcome,COUNT(*),COALESCE(SUM(base_paise),0),COALESCE(SUM(tax_paise),0),COALESCE(SUM(fee_paise),0),SUM(remaining_inventory),SUM(arrivals),SUM(cancellations) FROM observation GROUP BY outcome ORDER BY outcome"
 expected=[list(row) for row in db.execute(sq)]
 raw=mysql(container,sq.replace('FROM observation','FROM cm_observation')+';')
 actual=[[row.split('\t')[0],*[int(v) for v in row.split('\t')[1:]]] for row in raw.splitlines()]
 checks['outcome_counts_and_money_inventory_totals']=expected==actual
 checks['capacity_conservation']=mysql(container,'SELECT COUNT(*) FROM (SELECT s.id FROM cm_service s JOIN cm_service_cabin c ON c.service_id=s.id GROUP BY s.id HAVING SUM(c.capacity)<>MAX(s.capacity)) x;').strip()=='0'
 checks['summary_rows']=mysql(container,'SELECT COUNT(*) FROM cm_route_day_summary;').strip()==str(730*48)
 checks['summary_attempts']=int(mysql(container,'SELECT SUM(attempts) FROM cm_route_day_summary;').strip())==576*730
 sample=db.execute('SELECT id,departure_utc_minute,arrival_utc_minute FROM departure ORDER BY id LIMIT 1').fetchone()
 def stamp(m):
  day,minute=divmod(m,1440)
  return (datetime.datetime.combine(datetime.date.fromordinal(day),datetime.time())+datetime.timedelta(minutes=minute)).strftime('%Y-%m-%d %H:%M:%S')
 converted=mysql(container,f"SELECT DATE_FORMAT(departure_at,'%Y-%m-%d %H:%i:%s'),DATE_FORMAT(arrival_at,'%Y-%m-%d %H:%i:%s') FROM cm_departure WHERE id={sample[0]};").strip().split('\t')
 checks['utc_minute_conversion']=converted==[stamp(sample[1]),stamp(sample[2])]
 history_id=db.execute("SELECT id FROM departure WHERE travel_date='2026-10-05' ORDER BY id LIMIT 1").fetchone()[0]
 queries={
  'flight_search':"SELECT d.id,s.airline,(o.base_paise+o.tax_paise+o.fee_paise) fare FROM cm_service s JOIN cm_departure d ON d.service_id=s.id JOIN cm_observation o ON o.departure_id=d.id AND o.collection_date='2026-10-05' WHERE s.route='BOM-DEL' AND d.travel_date='2026-10-26' AND o.outcome='AVAILABLE' ORDER BY fare,d.id LIMIT 50",
  'flight_history':f"SELECT collection_date,outcome,base_paise FROM cm_observation WHERE departure_id={history_id} ORDER BY collection_date DESC LIMIT 60",
  'route_overview':"SELECT collection_date,available_count,total_paise/NULLIF(available_count,0) AS mean_paise FROM cm_route_day_summary WHERE route='BOM-DEL' AND collection_date BETWEEN '2025-10-06' AND '2026-10-05' ORDER BY collection_date",
  'network_day':"SELECT route,attempts,available_count,total_paise FROM cm_route_day_summary WHERE collection_date='2026-10-05'"}
 plans={}
 for name,q in queries.items():plans[name]=mysql(container,'EXPLAIN ANALYZE '+q+';').strip()
 result={'checks':checks,'passed':all(checks.values()),'query_plans':plans,'aggregate_fidelity':actual,'note':'Local single-client server plans; not an internet, concurrent-load or future-scale SLA.'}
 Path(out).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'checks':checks,'passed':result['passed']},indent=2))
 if not result['passed']:raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--container',required=True);p.add_argument('--out',required=True);a=p.parse_args();audit(a.source,a.container,a.out)
