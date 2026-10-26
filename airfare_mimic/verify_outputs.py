import argparse,json,sqlite3
from pathlib import Path
# Verify independently exported daily and annual histories agree on all physics.
p=argparse.ArgumentParser()
p.add_argument('--full',default='output/year')
p.add_argument('--day',default='output/day')
a=p.parse_args()
y=sqlite3.connect(str(Path(a.full)/'airfare.sqlite'))
y.execute('ATTACH DATABASE ? AS daily',(str(Path(a.day)/'airfare.sqlite'),))
q='''SELECT count(*) FROM daily.collection_result d JOIN daily.collection_run dr ON dr.id=d.run_id JOIN collection_run yr ON yr.collection_date=dr.collection_date JOIN collection_result r ON r.run_id=yr.id AND r.flight_id=d.flight_id LEFT JOIN fare_observation f ON f.result_id=r.id LEFT JOIN daily.fare_observation df ON df.result_id=d.id JOIN simulation_inventory_state s ON s.result_id=r.id JOIN daily.simulation_inventory_state ds ON ds.result_id=d.id WHERE r.horizon=d.horizon AND r.outcome=d.outcome AND f.total_paise IS df.total_paise AND s.remaining=ds.remaining'''
n=y.execute(q).fetchone()[0];expected=y.execute('SELECT count(*) FROM daily.collection_result').fetchone()[0];assert n==expected
full_manifest=json.loads((Path(a.full)/'manifest.json').read_text())
assert y.execute('SELECT count(*) FROM collection_run').fetchone()[0]==full_manifest['runs']
assert y.execute('SELECT count(*) FROM daily.collection_run').fetchone()[0]==1
assert not y.execute('PRAGMA foreign_key_check').fetchall()
result={'daily_full_identical_physics_rows':n,'full_runs':full_manifest['runs'],'daily_runs':1,'foreign_key_violations':0}
print(result)
