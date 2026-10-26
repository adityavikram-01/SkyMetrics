"""Read supplied DGCA workbooks into an auditable calibration input. Never edits sources."""
import argparse, calendar, hashlib, json, math, re
from pathlib import Path
import openpyxl

CITY_CODES = {'BOM':'MUMBAI','DEL':'DELHI','BLR':'BENGALURU','HYD':'HYDERABAD','MAA':'CHENNAI','CCU':'KOLKATA','PAT':'PATNA','GOI':'GOA','PNQ':'PUNE','AMD':'AHMEDABAD'}
CARRIERS = {'6E':'indigo','AI':'Air India','IX':'air india express','QP':'akasa air ','SG':'spicejet'}

def numeric(value):
    if isinstance(value, (int,float)) and not isinstance(value,bool) and math.isfinite(value):
        return value
    return None

def prepare(source, config):
    source = Path(source)
    report = {'source_status':'USER_SUPPLIED_DGCA_REPORTS_NOT_INDEPENDENTLY_AUTHENTICATED',
              'files':[], 'duplicates':[], 'issues':[], 'route_months':[], 'airline_months':[]}
    seen = {}
    def register(path):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in seen:
            report['duplicates'].append({'file':path.name,'same_as':seen[digest]})
            return False
        seen[digest] = path.name
        report['files'].append({'file':path.name,'sha256':digest})
        return True
    months = set()
    wanted = {(CITY_CODES[r.split('-')[0]],CITY_CODES[r.split('-')[1]]):r for r in config['routes']}
    for path in sorted(source.glob('DOM CITYPAIR DATA, *2024*.xlsx')):
        if not register(path): continue
        wb = openpyxl.load_workbook(path,read_only=True,data_only=True)
        sheet = wb.worksheets[0]
        rows = list(sheet.values)
        title = str(rows[0][0])
        match = re.search(r'For\s+(\w+)\s+(\d{4})', title,re.I)
        if not match: raise ValueError(f'Unrecognized reporting period: {path.name}')
        month = list(calendar.month_name).index(match[1].title())
        period = f'{match[2]}-{month:02d}'
        if period in months: raise ValueError(f'Conflicting duplicate period: {period}')
        months.add(period)
        totals = [0,0]
        for i,row in enumerate(rows,1):
            if not isinstance(row[0],(int,float)): continue
            a,b = str(row[1]).strip().upper(),str(row[2]).strip().upper()
            for origin,dest,value in [(a,b,row[3]),(b,a,row[4])]:
                if (origin,dest) in wanted:
                    report['route_months'].append({'route':wanted[(origin,dest)],'month':period,
                        'passengers':numeric(value),'file':path.name,'sheet':sheet.title,'row':i,
                        'provisional':'provisional' in title.lower()})
            for k in range(2):
                if numeric(row[3+k]) is not None: totals[k] += row[3+k]
        subtotal = next((r for r in rows if str(r[0]).strip().upper()=='SUB TOTAL'),None)
        if not subtotal or any(abs(totals[k]-subtotal[3+k])>1 for k in range(2)):
            report['issues'].append({'file':path.name,'issue':'Passenger subtotals do not reconcile'})
        wb.close()
    report['missing_citypair_months'] = [f'2024-{m:02d}' for m in range(1,13) if f'2024-{m:02d}' not in months]
    for carrier,stem in CARRIERS.items():
        for year in (24,25,26):
            path = source/f'{stem}{year}.xlsx'
            if not path.exists():
                report['issues'].append({'file':path.name,'issue':'Not supplied; no imputation performed'})
                continue
            register(path)
            wb = openpyxl.load_workbook(path,read_only=True,data_only=True)
            sheet = wb.worksheets[0]
            rows = list(sheet.values)
            actual_year = int(rows[0][0])
            if actual_year != 2000+year: raise ValueError(f'Year mismatch: {path.name}')
            for i,row in enumerate(rows[3:15],4):
                label = str(row[0]).strip().upper()[:3]
                month = next((m for m in range(1,13) if calendar.month_abbr[m].upper()==label),None)
                if month is None or numeric(row[4]) is None: continue
                pax, rpk, ask, plf = map(numeric,(row[4],row[5],row[6],row[7]))
                computed = 100*rpk/ask if rpk is not None and ask else None
                if computed is not None and plf is not None and abs(computed-plf)>.15:
                    report['issues'].append({'file':path.name,'row':i,'issue':'Reported PLF differs from RPK/ASK'})
                report['airline_months'].append({'airline':carrier,'month':f'{actual_year}-{month:02d}',
                    'departures':numeric(row[1]),'passengers':pax,'rpk_thousand':rpk,'ask_thousand':ask,
                    'load_factor_percent':plf,'file':path.name,'sheet':sheet.title,'row':i})
            wb.close()
    report['route_coverage'] = {r:sum(x['route']==r for x in report['route_months']) for r in config['routes']}
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',required=True);parser.add_argument('--config',required=True);parser.add_argument('--out',required=True)
    args=parser.parse_args(); result=prepare(args.source,json.loads(Path(args.config).read_text()))
    target=Path(args.out)
    if target.exists(): raise SystemExit('Refusing to overwrite calibration output')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['missing_citypair_months','route_coverage','issues','duplicates']},indent=2))
    print(f"Read {len(result['files'])} distinct source files; {len(result['route_months'])} route-month and {len(result['airline_months'])} airline-month records")
