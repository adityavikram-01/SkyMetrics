import sqlite3,tempfile,unittest
from pathlib import Path
from commerce_dataset import SCHEMA
from extend_commerce import enrich
from commerce_offers import price_offer,connection
class ExtensionTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'test.sqlite'
  d=sqlite3.connect(self.path);d.executescript(SCHEMA)
  d.execute("INSERT INTO dataset VALUES('test','commerce-1','{}',1)")
  for a in ('DEL','BOM'):d.execute('INSERT INTO airport VALUES(?,?,?)',(a,a,'Asia/Kolkata'))
  for a in ('6E','AI','IX','QP','SG'):
   d.execute('INSERT INTO airline VALUES(?,?)',(a,a));d.execute("INSERT INTO service_rating VALUES(?,4,'SIMULATED_SERVICE_RATING',NULL,'test')",(a,))
  d.execute("INSERT INTO route VALUES('DEL-BOM','DEL','BOM',120,500000,'test')")
  d.execute("INSERT INTO service VALUES(3,'DEL-BOM','AI','SIM-AI-1',600,'A320',180,'1111111','2024-01-01','2027-01-01','ASSUMED')")
  d.execute("INSERT INTO departure VALUES(1,3,'2026-10-26',1000,1120)")
  for seats in range(1,181):d.execute("INSERT INTO observation VALUES(1,?,21,'AVAILABLE',400000,20000,25000,?,?,0,0)",(seats,seats,seats))
  d.commit();d.close();enrich(self.path)
  self.db=sqlite3.connect(self.path);self.db.row_factory=sqlite3.Row
 def tearDown(self):self.db.close();self.temp.cleanup()
 def test_cabin_conservation_every_inventory_level(self):
  self.assertEqual(self.db.execute('SELECT SUM(capacity) FROM service_cabin').fetchone()[0],180)
  for seats,total in self.db.execute('SELECT search_day,SUM(cabin_bookable_seats) FROM cabin_observation GROUP BY search_day'):self.assertEqual(seats,total)
 def test_policy_diversity_and_provenance(self):
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM offer_policy').fetchone()[0],17)
  self.assertEqual(self.db.execute("SELECT checked_bag_kg FROM offer_policy WHERE airline='IX' AND code='LITE'").fetchone()[0],0)
  self.assertEqual(self.db.execute("SELECT checked_bag_kg FROM offer_policy WHERE airline='AI' AND code='VALUE'").fetchone()[0],15)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM service_rating WHERE review_count IS NOT NULL').fetchone()[0],0)
  self.assertFalse(self.db.execute('PRAGMA foreign_key_check').fetchall())
 def test_passenger_totals_and_capacity(self):
  row=dict(self.db.execute("SELECT * FROM cabin_observation WHERE search_day=10 AND cabin='ECONOMY'").fetchone());row['airline']='AI'
  p=dict(self.db.execute("SELECT * FROM offer_policy WHERE airline='AI' AND code='VALUE'").fetchone())
  q=price_offer(row,p,2,1,1);self.assertEqual(q['total_paise'],2*445000+425000+175000)
  for args in ((0,1,0),(1,0,2),(9,1,0),(1.5,0,0)):
   with self.assertRaises(ValueError):price_offer(row,p,*args)
  row['cabin_bookable_seats']=2;self.assertIsNone(price_offer(row,p,2,1))
  row['outcome']='TIMEOUT';self.assertIsNone(price_offer(row,p))
 def test_connections(self):
  a=dict(origin='BOM',destination='DEL',search_day=1,departure_utc_minute=100,arrival_utc_minute=220)
  b=dict(origin='DEL',destination='CCU',search_day=1,departure_utc_minute=400,arrival_utc_minute=520)
  r=dict(airport='DEL',minimum_minutes=180,maximum_minutes=360)
  q=dict(total_paise=500000,seats_required=1,checked_bag_kg_per_seated_passenger=15)
  self.assertEqual(connection(a,b,r,q,q)['total_paise'],1000000)
  b['departure_utc_minute']=399;self.assertIsNone(connection(a,b,r,q,q))
  b['departure_utc_minute']=400;b['search_day']=2;self.assertIsNone(connection(a,b,r,q,q))
 def test_repeat_migration_refused(self):
  with self.assertRaises(ValueError):enrich(self.path)
if __name__=='__main__':unittest.main()
