"""Additive commerce model; preserves baseline observations and records assumptions."""
import argparse, hashlib, json, sqlite3
from pathlib import Path
from datetime import datetime, timezone
VERSION = 'commerce-2'
SOURCES = [
 ('indigo-baggage','https://www.goindigo.in/travel-information/en/baggage-allowance.html','Domestic standard baggage allowance; fare exceptions apply.'),
 ('indigo-families','https://www.goindigo.in/travel-information/en/fare-rules.html','Fare families vary in inclusions and flexibility.'),
 ('airindia-families','https://www.airindia.com/content/dam/air-india/newsroom/press-releases/pdf/Press_Release_Air_India_Fare_Families_21Oct24.pdf','Branded families; not a source for our illustrative prices.'),
 ('aix-domestic','https://flights.airindiaexpress.com/en-in/domestic-flights','Lite, Value and Flex; baggage depends on family.'),
 ('akasa-manual','https://sme.akasaair.com/smeusermanual.pdf','7 kg cabin and 15 kg checked allowance shown in booking example.'),
 ('spicejet-baggage','https://corporate.spicejet.com/Baggage.aspx','Baggage rules and purchasable allowances.'),
]
# All tuples below are SCENARIO POLICIES, not a transcription of airline terms.
# code, checked kg, meal, seat selection, refundable, change fee, cancellation fee, surcharge (INR)
POLICIES = {
 '6E':[('STANDARD',15,0,0,0,3000,4000,0),('PLUS',15,1,1,0,1500,3000,1000),('FLEX',20,1,1,1,0,1500,2300)],
 'AI':[('VALUE',15,1,0,0,3000,4500,0),('CLASSIC',20,1,1,0,1500,3000,1200),('FLEX',25,1,1,1,0,1000,2800)],
 'IX':[('LITE',0,0,0,0,3000,4000,0),('VALUE',15,0,0,0,2500,3500,850),('FLEX',15,1,1,1,0,1800,1900)],
 'QP':[('SAVER',15,0,0,0,2500,3500,0),('PLUS',15,1,1,0,1200,2500,900),('FLEX',20,1,1,1,0,1500,2100)],
 'SG':[('SAVER',15,0,0,0,3000,4000,0),('PLUS',20,1,1,0,1500,3000,1100),('FLEX',20,1,1,1,0,2000,2400)],
}
DDL = '''
CREATE TABLE IF NOT EXISTS schema_revision(version TEXT PRIMARY KEY,parent_dataset_id TEXT NOT NULL,definition_sha256 TEXT NOT NULL,applied_at TEXT NOT NULL,notes TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS calibration_source(code TEXT PRIMARY KEY,url TEXT NOT NULL,checked_on TEXT NOT NULL,scope TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS offer_policy(id INTEGER PRIMARY KEY,airline TEXT NOT NULL REFERENCES airline(code),code TEXT NOT NULL,cabin TEXT NOT NULL CHECK(cabin IN ('ECONOMY','PREMIUM_ECONOMY','BUSINESS')),cabin_bag_kg INTEGER NOT NULL,checked_bag_kg INTEGER NOT NULL,meal_included INTEGER NOT NULL,seat_selection_included INTEGER NOT NULL,refundable INTEGER NOT NULL,change_fee_paise INTEGER NOT NULL,cancel_fee_paise INTEGER NOT NULL,surcharge_paise INTEGER NOT NULL,adult_multiplier_bp INTEGER NOT NULL,child_multiplier_bp INTEGER NOT NULL,infant_fee_paise INTEGER NOT NULL,provenance TEXT NOT NULL,UNIQUE(airline,code,cabin));
CREATE TABLE IF NOT EXISTS service_cabin(service_id INTEGER NOT NULL REFERENCES service(id),cabin TEXT NOT NULL,capacity INTEGER NOT NULL CHECK(capacity>0),price_multiplier_bp INTEGER NOT NULL CHECK(price_multiplier_bp>=10000),inventory_method TEXT NOT NULL,PRIMARY KEY(service_id,cabin));
CREATE TABLE IF NOT EXISTS rating_component(airline TEXT NOT NULL REFERENCES airline(code),component TEXT NOT NULL,score REAL NOT NULL CHECK(score BETWEEN 1 AND 5),weight REAL NOT NULL CHECK(weight>0),provenance TEXT NOT NULL,PRIMARY KEY(airline,component));
CREATE TABLE IF NOT EXISTS route_service_profile(route TEXT PRIMARY KEY REFERENCES route(code),service_count INTEGER NOT NULL,carrier_count INTEGER NOT NULL,assignment_status TEXT NOT NULL,demand_source TEXT NOT NULL,limitations TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS connection_rule(airport TEXT PRIMARY KEY REFERENCES airport(code),minimum_minutes INTEGER NOT NULL,maximum_minutes INTEGER NOT NULL,protected INTEGER NOT NULL CHECK(protected=0),provenance TEXT NOT NULL,CHECK(minimum_minutes>0 AND maximum_minutes>=minimum_minutes));
CREATE INDEX IF NOT EXISTS offer_policy_filter ON offer_policy(airline,cabin,checked_bag_kg,refundable);
CREATE VIEW IF NOT EXISTS cabin_observation AS
 SELECT o.*, c.cabin,c.capacity AS cabin_capacity,c.price_multiplier_bp,
 CASE WHEN o.outcome='AVAILABLE' THEN
 CASE WHEN c.cabin='ECONOMY' THEN o.bookable_seats-COALESCE((SELECT SUM(CAST(o.bookable_seats*x.capacity/s.capacity AS INTEGER)) FROM service_cabin x WHERE x.service_id=s.id AND x.cabin!='ECONOMY'),0)
 ELSE CAST(o.bookable_seats*c.capacity/s.capacity AS INTEGER) END ELSE NULL END AS cabin_bookable_seats
 FROM observation o JOIN departure d ON d.id=o.departure_id JOIN service s ON s.id=d.service_id JOIN service_cabin c ON c.service_id=s.id;
'''

def enrich(path):
 db=sqlite3.connect(path); db.execute('PRAGMA foreign_keys=ON')
 if db.execute("SELECT 1 FROM sqlite_master WHERE name='schema_revision'").fetchone() and db.execute('SELECT 1 FROM schema_revision WHERE version=?',(VERSION,)).fetchone():
  db.close(); raise ValueError('Revision already installed; no changes made')
 parent=db.execute('SELECT id FROM dataset').fetchone()[0]
 db.executescript('BEGIN IMMEDIATE;'+DDL)
 try:
  db.executemany('INSERT INTO calibration_source VALUES(?,?,?,?)',[(a,b,'2026-10-11',c) for a,b,c in SOURCES])
  for airline,policies in POLICIES.items():
   for code,bag,meal,seat,refund,change,cancel,extra in policies:
    db.execute('INSERT INTO offer_policy VALUES(NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(airline,code,'ECONOMY',7,bag,meal,seat,refund,change*100,cancel*100,extra*100,10000,9500 if airline=='AI' else 10000,175000 if airline=='AI' else 150000,'SIMULATED_POLICY; fee amounts and child/infant rates assumed; not current airline terms'))
   if airline=='AI':
    for cabin,bag in [('PREMIUM_ECONOMY',25),('BUSINESS',30)]:
     db.execute('INSERT INTO offer_policy VALUES(NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(airline,'FLEX',cabin,7,bag,1,1,1,0,100000,0,10000,9500,175000,'SIMULATED_PREMIUM_PRODUCT_NOT_VERIFIED_CONFIGURATION'))
   # Explainable mock components; not a consumer airline ranking.
   for i,(component,weight) in enumerate([('comfort',.3),('service',.3),('value',.4)]):
    v=3.4+(int(hashlib.sha256((airline+component).encode()).hexdigest()[:4],16)%12)/10
    db.execute('INSERT INTO rating_component VALUES(?,?,?,?,?)',(airline,component,round(v,1),weight,'SIMULATED_DEMO_ATTRIBUTE_NO_REVIEWS'))
   score=db.execute('SELECT SUM(score*weight)/SUM(weight) FROM rating_component WHERE airline=?',(airline,)).fetchone()[0]
   db.execute('UPDATE service_rating SET score=?,method=? WHERE airline=?',(round(score,1),'Weighted simulated comfort 30%, service 30%, value 40%; no actual reviews',airline))
  for sid,airline,cap in db.execute('SELECT id,airline,capacity FROM service').fetchall():
   premium=12 if airline=='AI' and sid%3==0 else 0
   business=12 if airline=='AI' else 0
   for cabin,n,m in [('ECONOMY',cap-premium-business,10000),('PREMIUM_ECONOMY',premium,16000),('BUSINESS',business,26000)]:
    if n:db.execute('INSERT INTO service_cabin VALUES(?,?,?,?,?)',(sid,cabin,n,m,'PROPORTIONAL_SCENARIO_ALLOCATION; not independently observed cabin inventory'))
  db.execute("INSERT INTO route_service_profile SELECT route,COUNT(*),COUNT(DISTINCT airline),'ASSUMED_NOT_VERIFIED_TIMETABLE','USER_SUPPLIED_DGCA_CITYPAIR_AGGREGATES','Traffic supports total route demand, not individual airline presence or frequency' FROM service GROUP BY route")
  db.execute("INSERT INTO connection_rule SELECT code,CASE WHEN code IN ('DEL','BOM') THEN 180 ELSE 120 END,360,0,'ASSUMED_SAME_AIRPORT_SELF_TRANSFER; no terminal guarantees' FROM airport")
  assert not db.execute('PRAGMA foreign_key_check').fetchone()
  db.execute('INSERT INTO schema_revision VALUES(?,?,?,?,?)',(VERSION,parent,hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),datetime.now(timezone.utc).isoformat(),'Additive scenario policies and proportional cabin inventory. Baseline fare observations unchanged.'))
  db.commit()
 except Exception:
  db.rollback();raise
 finally:db.close()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('database');a=p.parse_args();enrich(a.database)
