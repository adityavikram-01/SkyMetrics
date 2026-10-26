"""Versioned synthetic flight offers. Sources calibrate aggregates, not real schedules."""
import argparse, hashlib, json, math, random, sqlite3, time
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parent
VERSION='commerce-1'
SEED=20261011
HORIZON=60
AIRPORTS={'AMD':('Ahmedabad',23.07,72.63),'BLR':('Bengaluru',13.20,77.71),'BOM':('Mumbai',19.09,72.87),'CCU':('Kolkata',22.65,88.45),'COK':('Kochi',10.15,76.39),'DEL':('Delhi',28.56,77.10),'GAU':('Guwahati',26.11,91.59),'GOI':('Goa',15.38,73.83),'HYD':('Hyderabad',17.24,78.43),'LKO':('Lucknow',26.76,80.88),'MAA':('Chennai',12.99,80.17),'PAT':('Patna',25.59,85.09),'PNQ':('Pune',18.58,73.92),'SXR':('Srinagar',33.99,74.77)}
AIRLINES={'6E':('IndiGo','A320',180,1.0),'AI':('Air India','A320',180,1.13),'IX':('Air India Express','B737',186,.97),'QP':('Akasa Air','B737',189,.96),'SG':('SpiceJet','B737',189,.95)}
SCHEMA='''
PRAGMA foreign_keys=ON;
CREATE TABLE dataset(id TEXT PRIMARY KEY,version TEXT,config_json TEXT,is_synthetic INTEGER CHECK(is_synthetic=1));
CREATE TABLE airport(code TEXT PRIMARY KEY,name TEXT,timezone TEXT);
CREATE TABLE airline(code TEXT PRIMARY KEY,name TEXT);
CREATE TABLE route(code TEXT PRIMARY KEY,origin TEXT REFERENCES airport,destination TEXT REFERENCES airport,duration_minutes INTEGER,baseline_paise INTEGER,provenance TEXT);
CREATE TABLE service(id INTEGER PRIMARY KEY,route TEXT REFERENCES route,airline TEXT REFERENCES airline,flight_number TEXT UNIQUE,departure_minute INTEGER,aircraft TEXT,capacity INTEGER,operating_days TEXT,valid_from TEXT,valid_to TEXT,schedule_status TEXT);
CREATE TABLE departure(id INTEGER PRIMARY KEY,service_id INTEGER REFERENCES service,travel_date TEXT,departure_utc_minute INTEGER,arrival_utc_minute INTEGER,CHECK(arrival_utc_minute>departure_utc_minute),UNIQUE(service_id,travel_date));
CREATE TABLE fare_product(id INTEGER PRIMARY KEY,airline TEXT REFERENCES airline,code TEXT,cabin TEXT,cabin_bag_kg INTEGER,checked_bag_kg INTEGER,meal_included INTEGER,seat_selection_included INTEGER,refundable INTEGER,change_fee_paise INTEGER,cancel_fee_paise INTEGER,surcharge_paise INTEGER,conditions TEXT,provenance TEXT);
CREATE TABLE service_rating(airline TEXT PRIMARY KEY REFERENCES airline,score REAL CHECK(score BETWEEN 1 AND 5),kind TEXT CHECK(kind='SIMULATED_SERVICE_RATING'),review_count INTEGER CHECK(review_count IS NULL),method TEXT);
CREATE TABLE observation(departure_id INTEGER REFERENCES departure,search_day INTEGER,horizon INTEGER CHECK(horizon BETWEEN 1 AND 60),outcome TEXT CHECK(outcome IN ('AVAILABLE','SOLD_OUT','NO_OFFER','TIMEOUT','PARSE_ERROR','RATE_LIMITED')),base_paise INTEGER,tax_paise INTEGER,fee_paise INTEGER,bookable_seats INTEGER,remaining_inventory INTEGER,arrivals INTEGER,cancellations INTEGER,CHECK(remaining_inventory>=0),CHECK(bookable_seats IS NULL OR bookable_seats BETWEEN 0 AND remaining_inventory),CHECK((outcome='AVAILABLE' AND base_paise>0 AND tax_paise>=0 AND fee_paise>=0 AND bookable_seats>0) OR (outcome!='AVAILABLE' AND base_paise IS NULL AND tax_paise IS NULL AND fee_paise IS NULL AND bookable_seats IS NULL)),PRIMARY KEY(departure_id,search_day)) WITHOUT ROWID;
CREATE TABLE source_record(id INTEGER PRIMARY KEY,kind TEXT,record_json TEXT);
'''

def rng(*key):
    return random.Random(int.from_bytes(hashlib.blake2b(str((SEED,*key)).encode(),digest_size=8).digest(),'big'))

def distance(a,b):
    _,lat1,lon1=AIRPORTS[a];_,lat2,lon2=AIRPORTS[b]
    p,q=map(math.radians,(lat1,lat2));dl=math.radians(lon2-lon1)
    return 6371*2*math.asin(math.sqrt(math.sin((q-p)/2)**2+math.cos(p)*math.cos(q)*math.sin(dl/2)**2))

def configuration():
    network=json.loads((ROOT/'calibration/network-48/network.json').read_text())
    evidence=json.loads((ROOT/'calibration/network-48/dgca.json').read_text())
    legacy=json.loads((ROOT/'config/final-synthetic.json').read_text())
    traffic=defaultdict(list)
    for row in evidence['route_months']:
        if row['passengers'] is not None: traffic[row['route']].append(row)
    means={r:sum(x['passengers'] for x in traffic[r])/len(traffic[r]) for r in network['directional_routes']}
    weights={r:math.sqrt(v) for r,v in means.items()}
    counts={r:4 for r in weights}
    # Allocate a bounded illustrative network; these are not inferred actual timetables.
    while sum(counts.values())<576:
        r=max((r for r in counts if counts[r]<36),key=lambda r:(weights[r]/(counts[r]+1),r))
        counts[r]+=1
    routes={}
    for r in counts:
        a,b=r.split('-');km=distance(a,b)
        old=legacy['routes'].get(r,{})
        routes[r]={'duration':old.get('duration_minutes',round((35+km/650*60)/5)*5),
                   'baseline':old.get('baseline',round((1900+km*2.1)/50)*50),
                   'monthly':{int(x['month'][-2:]):min(1.2,max(.8,x['passengers']/means[r])) for x in traffic[r]},
                   'services':counts[r]}
    lf=defaultdict(list)
    for x in evidence['airline_months']:
        if x['load_factor_percent'] is not None:lf[(x['airline'],int(x['month'][-2:]))].append(x['load_factor_percent']/100)
    profiles={a:{m:sum(lf[a,m])/len(lf[a,m]) if lf[a,m] else .85 for m in range(1,13)} for a in AIRLINES}
    services=[]
    for r,details in routes.items():
        rr=rng('roster',r); alternative=rr.choice(['IX','QP','SG'])
        roster=['6E','AI',alternative]
        if details['services']>=12:roster+=sorted(set(['IX','QP','SG'])-{alternative})[:1]
        for slot in range(details['services']):
            airline=roster[slot] if slot<len(roster) else rr.choices(roster,weights=[60,22]+[9]*(len(roster)-2))[0]
            minute=(330+round(slot*1080/details['services'])+rr.randrange(-10,11))%1440
            services.append({'route':r,'airline':airline,'minute':minute,'capacity':AIRLINES[airline][2],
                'flight_number':f'SIM-{airline}-{len(services)+1001}'})
    return {'version':VERSION,'seed':SEED,'routes':routes,'services':services,'load_factors':profiles,
        'events':legacy['events'],'source_hashes':[x['sha256'] for x in evidence['files']],
        'assumptions':['Schedules, aircraft, fare rules, ratings and fares are simulated, not DGCA observations.',
          'Contemporary five-carrier scenario across all simulated dates; not a reconstruction of historical carrier operations.',
          'Monthly load factor calibrates occupancy distribution only; no actual flight seat inventory is available.',
          'Missing May route seasonality uses neutral 1.0, not an observed value.',
          'GOA traffic assigned to GOI for this scenario; source does not establish airport split.',
          'One-adult economy observations; groups 1-9 use shared availability and same per-person fare.',
          'Retrospective aggregate calibration is for simulation; not evidence of forecast accuracy.']},evidence

def history(config,service,departure):
    rr=rng('flight',service['flight_number'],departure.isoformat())
    cap=service['capacity'];p=config['routes'][service['route']]
    lf=config['load_factors'][service['airline']][departure.month]
    target=min(1.15,max(.55,lf+rr.gauss(0,.09)))
    remaining=cap-round(cap*rr.uniform(.20,.38));noise=0;previous=None
    seasonal=p['monthly'].get(departure.month,1.)
    event=1.
    for e in config['events']:
        delta=(departure-date.fromisoformat(e['date'])).days
        if service['route'] in e['routes'] and -e['pre_days']<=delta<=e['post_days']:
            event=max(event,1+(e['multiplier']-1)*(1-abs(delta)/(max(e['pre_days'],e['post_days'])+1)))
    target=min(1.20,target+max(0,event-1)*.35)
    scale=rr.uniform(.90,1.10)*seasonal*event*(1.045 if departure.weekday() in (4,6) else 1)
    baseline=p['baseline']*AIRLINES[service['airline']][3]*scale
    for h in range(HORIZON,0,-1):
        booked=cap-remaining
        cancel=min(booked,max(0,round(rr.gauss(booked*.0025,.65))))
        desired=cap*(target-(target-.29)*(h/HORIZON)**.85)
        demand=max(.15,(desired-booked)/max(1,h/8)+.6)
        arrivals=min(remaining+cancel,max(0,round(rr.gauss(demand,math.sqrt(demand)))))
        remaining=remaining+cancel-arrivals
        noise=.86*noise+rr.gauss(0,.025)
        # One deterministic route-wide weekly regime, shared across departures.
        observed=departure-timedelta(days=h)
        regime=rng('regime',service['route'],observed.toordinal()//7).random()
        factor=.88 if regime<.08 else 1.18 if regime>.93 else 1
        occupancy=1-remaining/cap
        price=baseline*(.90+.48*occupancy**3)*(1+1.05*math.exp(-h/8)+.10*(max(h-35,0)/25)**2)*math.exp(noise)*factor
        amount=max(150000,min(6500000,round(price/25)*2500))
        if previous and rr.random()<.23:amount=previous
        previous=amount
        outcome='SOLD_OUT' if remaining==0 else 'NO_OFFER' if rr.random()<.008 else 'AVAILABLE'
        u=rr.random()
        if u<.014:outcome='TIMEOUT'
        elif u<.018:outcome='PARSE_ERROR'
        elif u<.021:outcome='RATE_LIMITED'
        if outcome=='AVAILABLE':
            fee=25000;tax=round((amount-fee)*.05/1.05);base=amount-fee-tax;seats=remaining
        else:base=tax=fee=seats=None
        yield (observed.toordinal(),h,outcome,base,tax,fee,seats,remaining,arrivals,cancel)

def quote(row,product,passengers=1):
    if not 1<=passengers<=9:raise ValueError('Passenger count must be 1..9')
    if row['outcome']!='AVAILABLE' or row['bookable_seats']<passengers:return None
    unit=row['base_paise']+row['tax_paise']+row['fee_paise']+product['surcharge_paise']
    return {'total_paise':unit*passengers,'per_person_paise':unit,'passengers':passengers,'is_synthetic':True}

def generate(out,days=30,end='2026-10-05'):
    if not 1<=days<=730:raise ValueError('Days must be 1..730')
    out=Path(out);out.mkdir(parents=True,exist_ok=True);path=out/'airfare.sqlite'
    if path.exists():raise ValueError('Refusing to overwrite existing database')
    config,evidence=configuration();config.update(days=days,end=end,horizon=HORIZON,generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    encoded=json.dumps(config,sort_keys=True);identity=hashlib.sha256(encoded.encode()).hexdigest()
    db=sqlite3.connect(path);db.executescript(SCHEMA)
    db.execute('INSERT INTO dataset VALUES(?,?,?,1)',(identity,VERSION,encoded))
    for code,(name,*_) in AIRPORTS.items():db.execute('INSERT INTO airport VALUES(?,?,?)',(code,name,'Asia/Kolkata'))
    for code,(name,*_) in AIRLINES.items():
        db.execute('INSERT INTO airline VALUES(?,?)',(code,name))
        db.execute('INSERT INTO service_rating VALUES(?,?,?,NULL,?)',(code,round(rng('rating',code).uniform(3.4,4.5),1),'SIMULATED_SERVICE_RATING','Illustrative scenario attribute; no customer reviews or measured service quality'))
        for label,bag,meal,selection,refund,change,cancel,extra in [('BASIC',0,0,0,0,300000,400000,0),('BAGGAGE',15,0,0,0,250000,350000,90000),('FLEX',20,1,1,1,0,100000,220000)]:
            db.execute('INSERT INTO fare_product VALUES(NULL,?,?,?,?,?,?,?,?,?,?,?,?,?)',(code,label,'ECONOMY',7,bag,meal,selection,refund,change,cancel,extra,'Per adult. Fees capped at eligible fare; fare difference may apply. Refundable does not mean free cancellation.','SIMULATED_POLICY_NOT_AIRLINE_TERMS'))
    for route,p in config['routes'].items():db.execute('INSERT INTO route VALUES(?,?,?,?,?,?)',(route,*route.split('-'),p['duration'],p['baseline']*100,'DGCA aggregate demand; duration and fare assumed'))
    for kind in ('route_months','airline_months'):
        db.executemany('INSERT INTO source_record VALUES(NULL,?,?)',[(kind,json.dumps(x)) for x in evidence[kind]])
    enddate=date.fromisoformat(end);start=enddate-timedelta(days=days-1);counter=Counter();fid=0;t=time.monotonic()
    for sid,s in enumerate(config['services'],1):
        db.execute('INSERT INTO service VALUES(?,?,?,?,?,?,?,?,?,?,?)',(sid,s['route'],s['airline'],s['flight_number'],s['minute'],AIRLINES[s['airline']][1],s['capacity'],'1111111',str(start+timedelta(days=1)),str(enddate+timedelta(days=HORIZON)),'ASSUMED_DAILY_SERVICE'))
        batch=[]
        for offset in range(days+HORIZON-1):
            departure=start+timedelta(days=offset+1);fid=sid*1000000+departure.toordinal()
            utc=departure.toordinal()*1440+s['minute']-330
            db.execute('INSERT INTO departure VALUES(?,?,?,?,?)',(fid,sid,str(departure),utc,utc+config['routes'][s['route']]['duration']))
            for row in history(config,s,departure):
                if start.toordinal()<=row[0]<=enddate.toordinal():
                    batch.append((fid,*row));counter[row[2]]+=1
        db.executemany('INSERT INTO observation VALUES(?,?,?,?,?,?,?,?,?,?,?)',batch)
        db.commit()
        if sid%48==0:print(f'{sid}/{len(config["services"])} services; {sum(counter.values()):,} observations; {time.monotonic()-t:.0f}s',flush=True)
    db.executescript('CREATE INDEX search_date ON observation(search_day,departure_id); CREATE INDEX flight_route ON service(route,airline); CREATE INDEX flight_date ON departure(travel_date,service_id); ANALYZE;')
    assert sum(counter.values())==days*HORIZON*len(config['services'])
    assert not db.execute('PRAGMA foreign_key_check').fetchone()
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    db.close()
    manifest={'dataset_id':identity,'version':VERSION,'is_synthetic':True,'days':days,'horizon':HORIZON,'services':len(config['services']),'routes':len(config['routes']),'observations':sum(counter.values()),'outcomes':dict(counter),'bytes':path.stat().st_size,'elapsed_seconds':round(time.monotonic()-t,2),'status':'GENERATED_NOT_ACTIVATED','limitations':config['assumptions']}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (out/'config.json').write_text(json.dumps(config,indent=2)+'\n')
    print(json.dumps(manifest,indent=2));return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--days',type=int,default=30);p.add_argument('--end',default='2026-10-05');a=p.parse_args();generate(a.out,a.days,a.end)
