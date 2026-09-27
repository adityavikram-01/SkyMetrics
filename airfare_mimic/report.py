"""Descriptive plausibility checks, not validation against real fares."""
import csv,gzip,json,math,statistics,sys,html
from collections import defaultdict,Counter
from datetime import date,datetime
from pathlib import Path

def quantile(xs,p):
    if not xs:return None
    t=(len(xs)-1)*p;i=int(t);return xs[i]+(xs[min(i+1,len(xs)-1)]-xs[i])*(t-i)

def summary(xs):
    xs=sorted(xs)
    if not xs:return dict(n=0)
    mean=statistics.mean(xs);sd=statistics.pstdev(xs)
    return dict(n=len(xs),mean=round(mean,2),median=round(quantile(xs,.5),2),sd=round(sd,2),cv=round(sd/mean,4),**{f'p{p}':round(quantile(xs,p/100),2) for p in [10,25,75,90,95]})

def report(path):
    path=Path(path);c=json.loads((path/'config.json').read_text());manifest=json.loads((path/'manifest.json').read_text())
    groups=defaultdict(list);outcomes=defaultdict(Counter);previous={};deltas=[];x=[];y=[];violations=Counter();runs=Counter();pair_counts=Counter();example=[]
    with gzip.open(path/'observations.csv.gz','rt',newline='') as f:
      for row in csv.DictReader(f):
        p=int(row['total_paise'])/100 if row['total_paise'] else None;h=int(row['horizon']);dep=date.fromisoformat(row['departure_date']);obs=date.fromisoformat(row['collection_date'])
        dims={'route':row['route'],'airline':row['airline'],'horizon':str(h),'month':row['departure_date'][:7],'weekday':str(dep.weekday()),'time_band':row['time_band'],'event':str(bool(row['event'])),'weekend':str(dep.weekday() in c['weekend_days']),'all':'all'}
        for dim,value in dims.items():
            outcomes[(dim,value)][row['outcome']]+=1
            if p is not None:groups[(dim,value)].append(p)
        violations['horizon']+=h!=(dep-obs).days
        violations['timestamp']+=datetime.fromisoformat(row['observed_at'])>=datetime.fromisoformat(row['departure_at'])
        violations['amount_state']+=(row['outcome']=='AVAILABLE')!=(p is not None)
        violations['bounds']+=p is not None and not(c['price_bounds'][0]<=p<=c['price_bounds'][1])
        violations['synthetic']+=row['is_synthetic']!='True'
        violations['inventory_bounds']+=not(0<=int(row['latent_remaining'])<=c['capacity'])
        runs[(row['collection_date'],h)]+=1
        fid=row['flight_id']
        if fid in previous:
            prev=previous[fid]
            if (obs-prev[0]).days==1:
                violations['inventory_transition']+=int(row['latent_remaining'])!=prev[2]+int(row['latent_cancellations'])-int(row['latent_arrivals'])
                if p is not None and prev[1] is not None:
                    d=p-prev[1];deltas.append(d);x.append(prev[1]);y.append(p);pair_counts['rise' if d>0 else 'drop' if d<0 else 'unchanged']+=1
        previous[fid]=(obs,p,int(row['latent_remaining']))
        if row['flight_number']=='SIM-6E-100' and row['departure_date']=='2026-08-15':example.append(row)
    violations['coverage']=sum(n!=len(c['services']) for n in runs.values())+int(len(runs)!=c['days']*len(c['horizons']))
    result=[]
    for (dim,val),o in sorted(outcomes.items()):
        n=sum(o.values());success=n-sum(o[k] for k in ['TIMEOUT','SOURCE_BLOCKED','PARSE_ERROR','RATE_LIMITED'])
        result.append(dict(dimension=dim,value=val,**summary(groups[(dim,val)]),attempts=n,collection_success_rate=round(success/n,5),sold_out_rate_among_successes=round(o['SOLD_OUT']/success,5) if success else None,no_offer_rate_among_successes=round(o['NO_OFFER']/success,5) if success else None,outcomes=dict(o)))
    with (path/'summary.csv').open('w',newline='') as f:
        keys=list(dict.fromkeys(k for r in result for k in r));w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(result)
    corr=statistics.correlation(x,y) if len(x)>1 else None
    diagnostics=dict(validation_type='PLAUSIBILITY_VALIDATION',invariant_violations=dict(violations),consecutive_available_pairs=len(x),price_change_counts=dict(pair_counts),price_change_rates={k:round(v/len(x),4) for k,v in pair_counts.items()},price_change_rupees=summary(deltas),pooled_lag1_price_correlation=corr,correlation_caveat='Pooled levels include route/flight differences and horizon trend; not a detrended residual autocorrelation estimate.',real_data_accuracy=None)
    (path/'validation.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
    if example:
        with (path/'example_flight_history.csv').open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=list(example[0]));w.writeheader();w.writerows(example)
    rows=''.join('<tr>'+''.join(f'<td>{html.escape(str(r.get(k,"")))}</td>' for k in ['dimension','value','n','median','p10','p90','collection_success_rate','sold_out_rate_among_successes'])+'</tr>' for r in result)
    horizons=sorted((r for r in result if r['dimension']=='horizon'),key=lambda r:int(r['value']))
    # Dependency-free SVG descriptive chart. Shading is dispersion, NOT a confidence interval.
    def xx(h):return 60+(45-h)/44*820
    maxp=max(r['p90'] for r in horizons)*1.08
    def yy(p):return 320-p/maxp*270
    polygon=' '.join(f"{xx(int(r['value'])):.1f},{yy(r['p10']):.1f}" for r in horizons)+ ' '+ ' '.join(f"{xx(int(r['value'])):.1f},{yy(r['p90']):.1f}" for r in reversed(horizons))
    line=' '.join(f"{xx(int(r['value'])):.1f},{yy(r['median']):.1f}" for r in horizons)
    svg=f'<svg viewBox="0 0 940 370" role="img" aria-label="Synthetic fares by booking horizon"><rect width="940" height="370" fill="white"/><polygon points="{polygon}" fill="#dce9fd"/><polyline points="{line}" fill="none" stroke="#2563eb" stroke-width="3"/><text x="60" y="24">SIMULATED · Median and P10–P90 dispersion · INR</text><text x="60" y="348">T+45</text><text x="840" y="348">T+1</text><text x="5" y="58">{maxp:,.0f}</text><text x="35" y="320">0</text></svg>'
    (path/'horizon.svg').write_text(svg)
    content=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>APIx simulated airfare report</title><style>body{{font:16px system-ui;max-width:1100px;margin:40px auto;padding:0 24px;color:#18304d}}h1{{font-size:34px}}.badge{{background:#fff0c2;padding:12px;border-radius:8px}}table{{border-collapse:collapse;width:100%;font-size:13px}}td,th{{border-bottom:1px solid #ddd;padding:8px;text-align:left}}pre{{white-space:pre-wrap;background:#f2f5fa;padding:16px}}svg{{width:100%}}</style><h1>APIx · Synthetic airfare histories</h1><p class="badge">SIMULATED — PLAUSIBILITY_VALIDATION. Real market accuracy has not been measured.</p><p>{manifest['runs']} daily runs · {manifest['expected_results']:,} collection results · 10 routes · 5 airlines · 46 illustrative daily services.</p><p>Search dates {manifest['collection_start']} through {manifest['collection_end']}. Departure dates extend 45 days past the final search date.</p>{svg}<p>The shaded area shows variation between simulated offers. It is not a confidence band for real Indian market prices. Sold-out and failed searches are excluded from fare statistics.</p><h2>Consistency checks and price changes</h2><pre>{html.escape(json.dumps(diagnostics,indent=2))}</pre><h2>What this dataset establishes</h2><p>It exercises coherent flight histories, persistent inventory, booking horizons, price changes, availability and missing-data handling. No historical route fares, observed airline premiums or actual historical schedules were used to fit the parameters.</p><p>Holiday dates use selected official calendars; price effects and route exposure are assumptions. Regional holiday coverage is incomplete. Observed event/weekend differences are descriptive, confounded by the configured composition, and are not causal market estimates. Pooled price correlation includes the imposed booking curve and route differences.</p><h2>Summary statistics</h2><table><tr><th>Dimension</th><th>Value</th><th>Available n</th><th>Median INR</th><th>P10</th><th>P90</th><th>Collection success</th><th>Sold out / success</th></tr>{rows}</table><p>Source and assumptions: ../../docs/evidence.md. Model: ../../docs/model.md.</p></html>'''
    (path/'report.html').write_text(content)
    print(json.dumps(diagnostics,indent=2));assert not any(violations.values()),violations

if __name__=='__main__':report(sys.argv[1])
