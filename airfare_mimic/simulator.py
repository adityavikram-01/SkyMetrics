"""Dependency-free, explicitly synthetic airfare history generator; Python 3.11+."""
import argparse, csv, gzip, hashlib, json, math, random, sqlite3, uuid
from collections import Counter
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from market_behaviour import calendar_multiplier, late_multiplier, market_adjustment, seasonal_multiplier, shock_multiplier, weekday_multiplier

VERSION='0.1.0'
IST=timezone(timedelta(hours=5,minutes=30))
FAILURES={'TIMEOUT','SOURCE_BLOCKED','PARSE_ERROR','RATE_LIMITED'}

def canonical(x): return json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False)
def digest(x): return hashlib.sha256(canonical(x).encode()).hexdigest()
def uid(*x): return str(uuid.uuid5(uuid.NAMESPACE_URL,'apix-sim:'+':'.join(map(str,x))))
def rng(seed,*x): return random.Random(int(digest([seed,*x]),16))
def clamp(x,a,b): return min(b,max(a,x))

def validate(c):
    canonical(c)  # rejects NaN and infinities anywhere
    def require(ok,msg):
        if not ok: raise ValueError(msg)
    def number(k,lo,hi):
        require(type(c[k]) in (int,float) and lo<=c[k]<=hi,f'{k} outside [{lo},{hi}]')
    require(c['model_version']==VERSION,'Unsupported model version')
    require(c['is_synthetic'] is True and c['currency']=='INR','Synthetic INR only')
    require(type(c['seed']) is int,'seed must be integer')
    require(type(c['days']) is int and 1<=c['days']<=3660,'days must be 1..3660')
    date.fromisoformat(c['end_date'])
    hs=c['horizons']; require(hs and all(type(h) is int and 1<=h<=45 for h in hs) and sorted(set(hs))==hs,'horizons must be sorted unique integers 1..45')
    number('capacity',1,500); require(type(c['capacity']) is int,'integer capacity required')
    for k in ['cancellation_probability','hold_probability','no_offer_probability']: number(k,0,1)
    number('rho',0,.999); number('noise_sigma',0,.3); number('bookings_per_day',0,30)
    number('near_departure_boost',0,5); number('early_premium',0,1)
    number('weekend_multiplier',.5,2); number('event_cap',1,3)
    require(len(c['initial_occupancy'])==2 and 0<=c['initial_occupancy'][0]<=c['initial_occupancy'][1]<=1,'invalid occupancy bounds')
    require(len(c['monthly'])==12 and all(.5<=x<=2 for x in c['monthly']),'invalid monthly factors')
    require(len(c['price_bounds'])==2 and 0<c['price_bounds'][0]<c['price_bounds'][1]<=1000000,'invalid price bounds')
    require(all(type(d) is int and 0<=d<=6 for d in c['weekend_days']),'invalid weekdays')
    require(set(c['failures'])<=FAILURES and all(0<=x<=1 for x in c['failures'].values()) and sum(c['failures'].values())<=1,'invalid failures')
    require(c['airlines'] and all(.5<=x<=2 for x in c['airlines'].values()),'invalid airline factors')
    require(c['routes'] and c['services'],'routes and services required')
    for r,p in c['routes'].items():
        parts=r.split('-'); require(len(parts)==2 and all(len(x)==3 and x.isupper() and x.isalpha() for x in parts) and parts[0]!=parts[1],'invalid route')
        require(100<=p['baseline']<=100000 and 1<=p['duration_minutes']<=1440,'invalid route baseline/duration')
    identities=set()
    for s in c['services']:
        require(s['route'] in c['routes'] and s['airline'] in c['airlines'],'unknown service route/airline')
        time.fromisoformat(s['local_time']); require(.5<=s['time_factor']<=2,'invalid time factor')
        key=(s['route'],s['airline'],s['flight_number'],s['local_time']);require(key not in identities,'duplicate service');identities.add(key)
    require({s['route'] for s in c['services']}==set(c['routes']),'route missing schedule')
    require({s['airline'] for s in c['services']}==set(c['airlines']),'airline missing schedule')
    for e in c['events']:
        date.fromisoformat(e['date']);require(set(e['routes'])<=set(c['routes']),'unknown event route')
        require(all(type(e[k]) is int and 0<=e[k]<=60 for k in ['pre_days','post_days']),'invalid event window')
        require(1<=e['multiplier']<=3,'invalid event multiplier')
    require(c['days']*len(hs)*len(c['services'])<=5000000,'run exceeds 5 million result safety limit')
    return c

def event_factor(c,route,departure):
    factor=1.; names=[]
    for e in c['events']:
        delta=(departure-date.fromisoformat(e['date'])).days
        if route in e['routes'] and -e['pre_days']<=delta<=e['post_days']:
            width=e['pre_days'] if delta<0 else e['post_days']
            factor*=1+(e['multiplier']-1)*(1-abs(delta)/(width+1));names.append(e['name'])
    return min(c['event_cap'],factor),'|'.join(names)

def flight_history(c,s,departure):
    """Always warm up from T45, so daily and yearly selection have identical physics."""
    sid=uid(s['route'],s['airline'],s['flight_number'],s['local_time'])
    fid=uid(sid,departure.isoformat()); r=rng(c['seed'],fid,VERSION)
    cap=c['capacity']; remaining=cap-round(cap*r.uniform(*c['initial_occupancy']))
    route=c['routes'][s['route']]; ef,events=event_factor(c,s['route'],departure)
    legacy_weekend=c['weekend_multiplier'] if departure.weekday() in c['weekend_days'] else 1
    cal=c['monthly'][departure.month-1]*legacy_weekend*weekday_multiplier(c,s['route'],departure)*seasonal_multiplier(c,s['route'],departure)*calendar_multiplier(c,s['route'],departure)*ef
    baseline=route['baseline']*c['airlines'][s['airline']]*s['time_factor']*math.exp(clamp(r.gauss(0,.10),-.25,.25))
    noise=0.; prev=None; history={}
    dep_at=datetime.combine(departure,time.fromisoformat(s['local_time']),IST)
    for h in range(45,0,-1):
        observed=departure-timedelta(days=h)
        # Persistent cancellations and bounded stochastic arrivals; not reported seats.
        cancellations=sum(r.random()<c['cancellation_probability'] for _ in range(cap-remaining))
        restored=min(cap,remaining+cancellations)
        demand=c['bookings_per_day']*cal*(1+.7*math.exp(-h/8))
        arrivals=sum(r.random()<min(.95,demand/20) for _ in range(20))
        remaining=max(0,restored-arrivals)
        noise=clamp(c['rho']*noise+r.gauss(0,c['noise_sigma']*math.sqrt(1-c['rho']**2)),-.3,.3)
        # Shared route/day and carrier/day shocks are deterministic and cached by key.
        
        shared=shared_shock(c['seed'],s['route'],s['airline'],observed)*shock_multiplier(c,s['route'],s['airline'])
        market_factor,market_state=market_adjustment(c,s['route'],s['airline'],observed)

        occupancy=1-remaining/cap
        bucket=1 if occupancy<.6 else 1.12 if occupancy<.8 else 1.32 if occupancy<.93 else 1.6
        
        curve=1+c['near_departure_boost']*late_multiplier(c,s['route'])*math.exp(-h/7)+c['early_premium']*(max(h-25,0)/20)**2

        
        target=baseline*cal*bucket*curve*market_factor*math.exp(noise+shared)

        target=round(clamp(target,*c['price_bounds'])/50)*50
        target=int(clamp(target,*c['price_bounds'])*100)
        amount=prev if prev is not None and r.random()<c['hold_probability'] else target
        prev=amount
        outcome='SOLD_OUT' if remaining==0 else 'NO_OFFER' if r.random()<c['no_offer_probability'] else 'AVAILABLE'
        cr=rng(c['seed'],fid,observed.isoformat(),'collection'); u=cr.random();cum=0
        for failure,p in sorted(c['failures'].items()):
            cum+=p
            if u<cum: outcome=failure;break
        
        history[h]=dict(market_state=market_state,
flight_id=fid,service_id=sid,route=s['route'],airline=s['airline'],flight_number=s['flight_number'],departure_date=departure.isoformat(),departure_at=dep_at.astimezone(timezone.utc).isoformat(),arrival_at=(dep_at+timedelta(minutes=route['duration_minutes'])).astimezone(timezone.utc).isoformat(),collection_date=observed.isoformat(),observed_at=datetime.combine(observed,time(9),IST).astimezone(timezone.utc).isoformat(),horizon=h,outcome=outcome,total_paise=amount if outcome=='AVAILABLE' else None,reported_seats_remaining=None,latent_remaining=remaining,latent_arrivals=min(restored,arrivals),latent_cancellations=cancellations,event=events,time_band='early_morning' if dep_at.hour<9 else 'daytime' if dep_at.hour<17 else 'evening' if dep_at.hour<21 else 'night',currency='INR',is_synthetic=True)
    return history

from functools import lru_cache
@lru_cache(maxsize=250000)
def shared_shock(seed,route,airline,day):
    # Seven-day moving average gives correlated shared shocks across searches.
    return sum(rng(seed,route,(day-timedelta(days=i)).isoformat(),'route').uniform(-.08,.08)+rng(seed,airline,(day-timedelta(days=i)).isoformat(),'airline').uniform(-.04,.04) for i in range(7))/math.sqrt(7)

SCHEMA='''
PRAGMA foreign_keys=ON;
CREATE TABLE simulation_dataset(id TEXT PRIMARY KEY,model_version TEXT NOT NULL,config_hash TEXT NOT NULL,config_json TEXT NOT NULL,is_synthetic INTEGER NOT NULL CHECK(is_synthetic=1));
CREATE TABLE airline(code TEXT PRIMARY KEY);
CREATE TABLE airport(code TEXT PRIMARY KEY);
CREATE TABLE route(code TEXT PRIMARY KEY,origin TEXT REFERENCES airport(code),destination TEXT REFERENCES airport(code));
CREATE TABLE flight_service(id TEXT PRIMARY KEY,route TEXT REFERENCES route(code),airline TEXT REFERENCES airline(code),flight_number TEXT,local_time TEXT,UNIQUE(route,airline,flight_number,local_time));
CREATE TABLE flight_departure(id TEXT PRIMARY KEY,service_id TEXT REFERENCES flight_service(id),departure_at TEXT,arrival_at TEXT,UNIQUE(service_id,departure_at));
CREATE TABLE collection_run(id TEXT PRIMARY KEY,dataset_id TEXT REFERENCES simulation_dataset(id),collection_date TEXT,observed_at TEXT,UNIQUE(dataset_id,collection_date));
CREATE TABLE collection_result(id TEXT PRIMARY KEY,run_id TEXT REFERENCES collection_run(id),flight_id TEXT REFERENCES flight_departure(id),horizon INTEGER CHECK(horizon BETWEEN 1 AND 45),outcome TEXT CHECK(outcome IN ('AVAILABLE','SOLD_OUT','NO_OFFER','TIMEOUT','SOURCE_BLOCKED','PARSE_ERROR','RATE_LIMITED')),UNIQUE(run_id,flight_id));
CREATE TABLE fare_observation(id TEXT PRIMARY KEY,result_id TEXT UNIQUE REFERENCES collection_result(id),total_paise INTEGER,currency TEXT CHECK(currency='INR'),is_synthetic INTEGER NOT NULL CHECK(is_synthetic=1),reported_seats_remaining INTEGER CHECK(reported_seats_remaining IS NULL));
CREATE TABLE simulation_inventory_state(result_id TEXT PRIMARY KEY REFERENCES collection_result(id),remaining INTEGER CHECK(remaining>=0),arrivals INTEGER CHECK(arrivals>=0),cancellations INTEGER CHECK(cancellations>=0));
CREATE TRIGGER fare_guard BEFORE INSERT ON fare_observation BEGIN
 SELECT CASE WHEN (SELECT outcome FROM collection_result WHERE id=NEW.result_id) NOT IN ('AVAILABLE','SOLD_OUT','NO_OFFER') THEN RAISE(ABORT,'collection failure cannot have fare observation') END;
 SELECT CASE WHEN (SELECT outcome FROM collection_result WHERE id=NEW.result_id)='AVAILABLE' AND (NEW.total_paise IS NULL OR NEW.total_paise<=0) THEN RAISE(ABORT,'positive available fare required') END;
 SELECT CASE WHEN (SELECT outcome FROM collection_result WHERE id=NEW.result_id)!='AVAILABLE' AND NEW.total_paise IS NOT NULL THEN RAISE(ABORT,'unavailable fare must be null') END;
END;
CREATE TRIGGER no_fare_update BEFORE UPDATE ON fare_observation BEGIN SELECT RAISE(ABORT,'append-only'); END;
CREATE TRIGGER no_fare_delete BEFORE DELETE ON fare_observation BEGIN SELECT RAISE(ABORT,'append-only'); END;
CREATE INDEX result_flight ON collection_result(flight_id,horizon);
CREATE INDEX result_run ON collection_result(run_id,outcome);
'''

def generate(c,out):
    validate(c); out=Path(out);out.mkdir(parents=True,exist_ok=True)
    dbpath=out/'airfare.sqlite'
    if dbpath.exists(): raise ValueError('Output database exists. Choose a new output directory to preserve previous results.')
    config_hash=digest(c);dataset_id=uid(VERSION,config_hash)
    db=sqlite3.connect(dbpath);db.executescript(SCHEMA)
    db.execute('INSERT INTO simulation_dataset VALUES(?,?,?,?,1)',(dataset_id,VERSION,config_hash,canonical(c)))
    for a in c['airlines']: db.execute('INSERT INTO airline VALUES(?)',(a,))
    for a in sorted({a for r in c['routes'] for a in r.split('-')}):db.execute('INSERT INTO airport VALUES(?)',(a,))
    for route in c['routes']:db.execute('INSERT INTO route VALUES(?,?,?)',(route,*route.split('-')))
    end=date.fromisoformat(c['end_date']);start=end-timedelta(days=c['days']-1)
    runs={}
    for i in range(c['days']):
        day=start+timedelta(days=i);rid=uid(dataset_id,day);runs[day.isoformat()]=rid
        db.execute('INSERT INTO collection_run VALUES(?,?,?,?)',(rid,dataset_id,day.isoformat(),datetime.combine(day,time(9),IST).astimezone(timezone.utc).isoformat()))
    sample=[]; counts=Counter();rows_hash=hashlib.sha256()
    with (out/'observations.csv.gz').open('wb') as raw:
      with gzip.GzipFile(filename='',fileobj=raw,mode='wb',mtime=0) as gz:
       import io
       with io.TextIOWrapper(gz,encoding='utf-8',newline='') as stream:
        writer=None
        for s in c['services']:
            sid=uid(s['route'],s['airline'],s['flight_number'],s['local_time'])
            db.execute('INSERT INTO flight_service VALUES(?,?,?,?,?)',(sid,s['route'],s['airline'],s['flight_number'],s['local_time']))
            for i in range(c['days']+44):
                departure=start+timedelta(days=i+1)
                history=flight_history(c,s,departure);inserted=False
                for h,row in history.items():
                    if h not in c['horizons'] or row['collection_date'] not in runs:continue
                    if not inserted:
                        db.execute('INSERT INTO flight_departure VALUES(?,?,?,?)',(row['flight_id'],sid,row['departure_at'],row['arrival_at']));inserted=True
                    rid=runs[row['collection_date']];result_id=uid(rid,row['flight_id'])
                    row.update(dataset_id=dataset_id,run_id=rid,result_id=result_id,model_version=VERSION,config_hash=config_hash,total_amount=f"{row['total_paise']/100:.2f}" if row['total_paise'] is not None else None)
                    db.execute('INSERT INTO collection_result VALUES(?,?,?,?,?)',(result_id,rid,row['flight_id'],h,row['outcome']))
                    if row['outcome'] not in FAILURES:db.execute('INSERT INTO fare_observation VALUES(?,?,?,?,1,NULL)',(uid(result_id,'fare'),result_id,row['total_paise'],'INR'))
                    db.execute('INSERT INTO simulation_inventory_state VALUES(?,?,?,?)',(result_id,row['latent_remaining'],row['latent_arrivals'],row['latent_cancellations']))
                    if writer is None:writer=csv.DictWriter(stream,fieldnames=list(row));writer.writeheader()
                    writer.writerow(row);rows_hash.update((canonical(row)+'\n').encode());counts[row['outcome']]+=1
                    if len(sample)<150:sample.append(dict(row))
            db.commit()
            print(f"Generated {s['flight_number']} {s['route']}",flush=True)
    expected=c['days']*len(c['services'])*len(c['horizons'])
    assert sum(counts.values())==expected
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    db.close()
    with (out/'sample.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(sample[0]));w.writeheader();w.writerows(sample)
    manifest=dict(dataset_id=dataset_id,model_version=VERSION,config_hash=config_hash,rows_sha256=rows_hash.hexdigest(),is_synthetic=True,validation_type='PLAUSIBILITY_VALIDATION',collection_start=str(start),collection_end=str(end),runs=c['days'],services=len(c['services']),expected_results=expected,outcomes=dict(counts),calendar_coverage='Selected holidays only; regional calendar coverage incomplete',schedule_status='Illustrative assumed schedules; not verified historical airline operations')
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (out/'config.json').write_text(json.dumps(c,indent=2)+'\n')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--config',default='config/default.json');p.add_argument('--out',required=True);p.add_argument('--date',help='Generate exactly one collection date');a=p.parse_args()
    c=json.loads(Path(a.config).read_text())
    if a.date:c.update(end_date=a.date,days=1)
    print(json.dumps(generate(c,a.out),indent=2))
