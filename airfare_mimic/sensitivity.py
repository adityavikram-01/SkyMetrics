import copy,csv,json,statistics
from datetime import date,timedelta
from pathlib import Path
from simulator import flight_history
c=json.loads(Path('config/default.json').read_text())
scenarios=[('default',c)]
for name in ['conservative','stress']:scenarios.append((name,json.loads(Path(f'config/{name}.json').read_text())))
for key,values in {'bookings_per_day':[1.6,2.8],'cancellation_probability':[.001,.009],'near_departure_boost':[.8,2.4],'early_premium':[0,.25],'noise_sigma':[.02,.09],'rho':[.3,.97],'hold_probability':[.1,.6],'weekend_multiplier':[1,1.2],'capacity':[150,220],'initial_occupancy':[[.1,.3],[.5,.7]],'no_offer_probability':[0,.04],'event_cap':[1,2]}.items():
 for val in values:
  v=copy.deepcopy(c);v[key]=val;scenarios.append((f'{key}={val}',v))
for name in ['baseline_low','baseline_high','airline_equal','month_flat','events_off','time_flat','failure_high']:
 v=copy.deepcopy(c)
 if name.startswith('baseline'):
  for r in v['routes'].values():r['baseline']*=.8 if name.endswith('low') else 1.2
 elif name=='airline_equal':v['airlines']={a:1 for a in v['airlines']}
 elif name=='month_flat':v['monthly']=[1]*12
 elif name=='events_off':v['events']=[]
 elif name=='time_flat':
  for s in v['services']:s['time_factor']=1
 else:v['failures']={k:p*3 for k,p in v['failures'].items()}
 scenarios.append((name,v))
rows=[]
# Same sample identities in every scenario: 3 carriers, 2 routes, 24 departure dates.
for name,v in scenarios:
 prices=[];sold=failed=total=0
 for s in [v['services'][0],v['services'][2],v['services'][-1]]:
  for month in range(1,13):
   for day in [4,20]:
    for r in flight_history(v,s,date(2026,month,day)).values():
     total+=1;sold+=r['outcome']=='SOLD_OUT';failed+=r['outcome'] in v['failures']
     if r['total_paise'] is not None:prices.append(r['total_paise']/100)
 rows.append(dict(scenario=name,attempts=total,available=len(prices),median_inr=statistics.median(prices),mean_inr=round(statistics.mean(prices),2),sold_out_per_attempt=round(sold/total,4),failure_per_attempt=round(failed/total,4)))
with Path('output/sensitivity.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(f'{len(rows)} fixed-seed scenarios; {rows[0]["attempts"]} results each. Sensitivity sample, not full-year reruns.')
