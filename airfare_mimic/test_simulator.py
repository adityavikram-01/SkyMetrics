import copy,gzip,json,sqlite3,tempfile,unittest
from datetime import date,timedelta
from pathlib import Path
from simulator import validate,flight_history,generate,event_factor
class SimulatorTests(unittest.TestCase):
 def setUp(self):self.c=json.loads(Path('config/default.json').read_text())
 def test_bad_configs(self):
  for field,val in [('rho',1),('noise_sigma',float('nan')),('horizons',[1,1]),('days',0),('is_synthetic',False),('failures',{'TIMEOUT':1.2}),('price_bounds',[5000,1000])]:
   c=copy.deepcopy(self.c);c[field]=val
   with self.assertRaises(ValueError):validate(c)
 def test_history(self):
  c=self.c;s=c['services'][0];h=flight_history(c,s,date(2026,8,15));self.assertEqual(h,flight_history(c,s,date(2026,8,15)))
  self.assertEqual(len({r['flight_id'] for r in h.values()}),1)
  for k,row in h.items():
   self.assertEqual(k,(date.fromisoformat(row['departure_date'])-date.fromisoformat(row['collection_date'])).days)
   self.assertEqual(row['total_paise'] is not None,row['outcome']=='AVAILABLE')
   if k<45:self.assertEqual(row['latent_remaining'],h[k+1]['latent_remaining']+row['latent_cancellations']-row['latent_arrivals'])
 def test_failure_and_soldout(self):
  c=self.c;c['failures']={'TIMEOUT':1};h=flight_history(c,c['services'][0],date(2026,8,15));self.assertTrue(all(r['outcome']=='TIMEOUT' and r['total_paise'] is None for r in h.values()))
  c['failures']={};c['initial_occupancy']=[1,1];c['cancellation_probability']=0
  self.assertTrue(all(r['outcome']=='SOLD_OUT' and r['total_paise'] is None for r in flight_history(c,c['services'][0],date(2026,8,15)).values()))
 def test_event_scope_and_cap(self):
  c=self.c;c['events']=[dict(name='Test',date='2026-08-15',routes=['BOM-DEL'],pre_days=2,post_days=2,multiplier=3)]*3
  self.assertEqual(event_factor(c,'BLR-DEL',date(2026,8,15))[0],1)
  self.assertEqual(event_factor(c,'BOM-DEL',date(2026,8,15))[0],c['event_cap'])
 def test_generation_reproducibility_and_database(self):
  c=self.c;c.update(days=1,services=c['services'][:1],routes={'BOM-DEL':c['routes']['BOM-DEL']},airlines={'6E':1},events=[])
  with tempfile.TemporaryDirectory() as td:
   a=generate(c,Path(td)/'a');b=generate(c,Path(td)/'b');self.assertEqual(a,b)
   self.assertEqual((Path(td)/'a/observations.csv.gz').read_bytes(),(Path(td)/'b/observations.csv.gz').read_bytes())
   con=sqlite3.connect(Path(td)/'a/airfare.sqlite');con.execute('PRAGMA foreign_keys=ON')
   self.assertEqual(con.execute('select count(*) from collection_run').fetchone()[0],1)
   self.assertEqual(con.execute('select count(*) from collection_result').fetchone()[0],45)
   self.assertEqual(con.execute("select count(*) from collection_result r join fare_observation f on f.result_id=r.id where r.outcome in ('TIMEOUT','SOURCE_BLOCKED','PARSE_ERROR','RATE_LIMITED')").fetchone()[0],0)
   with self.assertRaises(sqlite3.IntegrityError):con.execute('update fare_observation set total_paise=1')
   with self.assertRaises(sqlite3.IntegrityError):con.execute('update simulation_dataset set is_synthetic=0')
   con.close()
if __name__=='__main__':unittest.main()
