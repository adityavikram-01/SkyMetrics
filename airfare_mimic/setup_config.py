import json
from pathlib import Path
routes = [
 ('BOM-DEL',5200,130),('DEL-BOM',5350,130),
 ('BLR-DEL',6400,170),('DEL-BLR',6250,170),
 ('BLR-BOM',4200,110),('BOM-BLR',4300,110),
 ('CCU-DEL',5100,145),('DEL-CCU',5250,145),
 ('DEL-HYD',5300,135),('HYD-DEL',5200,135),
 ('DEL-PNQ',4900,125),('PNQ-DEL',5000,125),
 ('AMD-DEL',3600,95),('DEL-AMD',3750,95),
 ('BLR-PNQ',4100,100),('PNQ-BLR',4200,100),
 ('BOM-HYD',3500,90),('HYD-BOM',3600,90),
 ('BOM-MAA',4600,120),('MAA-BOM',4700,120),
 ('DEL-PAT',5600,105),('PAT-DEL',5450,105),
 ('DEL-GOI',6100,155),('GOI-DEL',5950,155),
]
c=dict(model_version='0.1.0',seed=20260913,end_date='2026-09-13',days=365,horizons=list(range(1,46)),currency='INR',is_synthetic=True,capacity=180,initial_occupancy=[.25,.55],bookings_per_day=2.2,cancellation_probability=.004,near_departure_boost=1.6,early_premium=.10,noise_sigma=.045,rho=.85,hold_probability=.32,no_offer_probability=.008,weekend_multiplier=1.07,weekend_days=[5,6],price_bounds=[1800,35000],event_cap=1.6,monthly=[1.05,1,.98,1.02,1.08,1.04,.93,.96,1,1.08,1.07,1.12],failures={'TIMEOUT':.012,'SOURCE_BLOCKED':.002,'PARSE_ERROR':.003,'RATE_LIMITED':.003},airlines={'6E':1,'AI':1.10,'IX':.96,'QP':.98,'SG':.95},routes={r:{'baseline':b,'duration_minutes':d} for r,b,d in routes},services=[],events=[],provenance_default='ENGINEERING_ASSUMPTION')
for i,(r,b,d) in enumerate(routes):
 for a in ['6E','AI']:
  for j,t in enumerate(['06:30','18:30'] if a=='6E' else ['11:00','22:00']):
   c['services'].append(dict(route=r,airline=a,flight_number=f'SIM-{a}-{100+i*2+j}',local_time=t,time_factor=1.06 if j==0 else .98))
for i,(a,r,t) in enumerate([('IX','BLR-DEL','14:00'),('IX','BLR-BOM','09:30'),('QP','BOM-DEL','15:00'),('QP','BLR-PNQ','20:00'),('SG','BOM-DEL','08:00'),('SG','AMD-DEL','16:00')]):
 c['services'].append(dict(route=r,airline=a,flight_number=f'SIM-{a}-{300+i}',local_time=t,time_factor=1.0))
for date,name,scope,source in [('2025-10-02','Dussehra',['CCU-DEL','BLR-DEL','DEL-HYD'],'CAL2025'),('2025-10-20','Diwali',list(c['routes']),'CAL2025'),('2025-12-25','Christmas',list(c['routes']),'CAL2025'),('2026-01-26','Republic Day',list(c['routes']),'CAL2026'),('2026-03-04','Holi',['BOM-DEL','BLR-DEL','CCU-DEL','AMD-DEL'],'CAL2026'),('2026-08-15','Independence Day',list(c['routes']),'CAL2026'),('2026-10-02','Gandhi Jayanti',list(c['routes']),'CAL2026'),('2026-10-20','Dussehra',['CCU-DEL','BLR-DEL','DEL-HYD'],'CAL2026')]:
 c['events'].append(dict(name=name,date=date,routes=scope,pre_days=5,post_days=2,multiplier=1.22,date_source=source,effect_provenance='ENGINEERING_ASSUMPTION'))
for name,changes in [('default',{}),('conservative',{'noise_sigma':.025,'near_departure_boost':1.0,'bookings_per_day':1.9}),('stress',{'noise_sigma':.09,'near_departure_boost':2.2,'bookings_per_day':2.8})]:
 x={**c,**changes};Path(f'config/{name}.json').write_text(json.dumps(x,indent=2)+'\n')
