"""Read-only preview fixture from the final simulated dataset; no server connection."""
import sqlite3,json,datetime,statistics
from pathlib import Path
root=Path(__file__).resolve().parents[2]
db=sqlite3.connect(f'file:{root}/airfare_mimic/output/commerce-final/airfare.sqlite?mode=ro',uri=True);db.row_factory=sqlite3.Row
asof=datetime.date(2026,10,5)
def iso(m):
 day,minute=divmod(m,1440)
 return (datetime.datetime.combine(datetime.date.fromordinal(day),datetime.time())+datetime.timedelta(minutes=minute)).isoformat()+'Z'
services={str(x['id']):dict(x) for x in db.execute('SELECT * FROM service')}
for s in services.values():s['cabins']=[dict(x) for x in db.execute('SELECT cabin,capacity,price_multiplier_bp FROM service_cabin WHERE service_id=?',(s['id'],))]
flights=[]
for row in db.execute('''SELECT d.id,d.service_id,d.travel_date,d.departure_utc_minute,d.arrival_utc_minute,o.base_paise,o.tax_paise,o.fee_paise,o.bookable_seats FROM departure d JOIN observation o ON o.departure_id=d.id AND o.search_day=? WHERE d.travel_date BETWEEN '2026-10-19' AND '2026-11-02' AND o.outcome='AVAILABLE' ''',(asof.toordinal(),)):
 r=dict(row);flights.append(dict(id=r['id'],service=r['service_id'],date=r['travel_date'],departure=iso(r['departure_utc_minute']),arrival=iso(r['arrival_utc_minute']),base=r['base_paise'],tax=r['tax_paise'],fee=r['fee_paise'],seats=r['bookable_seats']))
groups={}
for r,h,total in db.execute('''SELECT s.route,o.horizon,o.base_paise+o.tax_paise+o.fee_paise FROM service s JOIN departure d ON d.service_id=s.id JOIN observation o ON o.departure_id=d.id WHERE d.travel_date BETWEEN '2026-09-05' AND '2026-10-04' AND o.horizon IN (1,7,14,21,30,45) AND o.outcome='AVAILABLE' '''):
 groups.setdefault(r,{}).setdefault(h,[]).append(total)
history={r:[dict(days=h,median=round(statistics.median(a)),count=len(a)) for h,a in sorted(v.items())] for r,v in groups.items()}
payload=dict(asOf=str(asof),start='2026-10-19',end='2026-11-02',services=services,flights=flights,policies=[dict(r) for r in db.execute('SELECT * FROM offer_policy')],airports=[dict(r) for r in db.execute('SELECT * FROM airport')],airlines=[dict(r) for r in db.execute('SELECT * FROM airline')],routes=[r[0] for r in db.execute('SELECT code FROM route')],history=history,ratings={r['airline']:r['score'] for r in db.execute('SELECT * FROM service_rating')})
p=root/'apix-frontend/src/users/preview.json';p.write_text(json.dumps(payload,separators=(',',':')));print(len(flights),'preview flights',p.stat().st_size,'bytes')
