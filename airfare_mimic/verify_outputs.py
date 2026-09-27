import csv,gzip,json,sqlite3
from pathlib import Path
# Verify independently exported daily and annual histories agree on all physics.
y=sqlite3.connect('output/year/airfare.sqlite')
y.execute("ATTACH DATABASE 'output/day/airfare.sqlite' AS daily")
q='''SELECT count(*) FROM daily.collection_result d JOIN daily.collection_run dr ON dr.id=d.run_id JOIN collection_run yr ON yr.collection_date=dr.collection_date JOIN collection_result r ON r.run_id=yr.id AND r.flight_id=d.flight_id LEFT JOIN fare_observation f ON f.result_id=r.id LEFT JOIN daily.fare_observation df ON df.result_id=d.id JOIN simulation_inventory_state s ON s.result_id=r.id JOIN daily.simulation_inventory_state ds ON ds.result_id=d.id WHERE r.horizon=d.horizon AND r.outcome=d.outcome AND f.total_paise IS df.total_paise AND s.remaining=ds.remaining'''
n=y.execute(q).fetchone()[0];expected=y.execute('SELECT count(*) FROM daily.collection_result').fetchone()[0];assert n==expected==2070
assert y.execute('SELECT count(*) FROM collection_run').fetchone()[0]==365
assert y.execute('SELECT count(*) FROM daily.collection_run').fetchone()[0]==1
assert not y.execute('PRAGMA foreign_key_check').fetchall()
result={'daily_yearly_identical_physics_rows':n,'annual_runs':365,'daily_runs':1,'foreign_key_violations':0}
Path('output/integration-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
