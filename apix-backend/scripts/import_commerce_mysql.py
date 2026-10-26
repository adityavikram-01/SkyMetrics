"""Resumable local Docker MySQL import. Credentials stay inside the container.
Run Flyway migration V5 first. Does not disable foreign keys or overwrite tables.
"""
import argparse,datetime,fcntl,hashlib,json,os,sqlite3,subprocess,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def command(args,**kwargs):
 p=subprocess.run(args,text=True,capture_output=True,**kwargs)
 if p.returncode:raise RuntimeError(p.stderr[:1500])
 return p.stdout

def mysql(container,sql):
 return command(['docker','exec','-i',container,'sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --local-infile=0 -uroot --batch --skip-column-names "$MYSQL_DATABASE"'],input=sql)

def encode(value,conversion):
 if value is None:return '\\N'
 if conversion=='ordinal_date':value=datetime.date.fromordinal(value).isoformat()
 elif conversion=='ordinal_minute':
  day,minute=divmod(value,1440)
  value=datetime.datetime.combine(datetime.date.fromordinal(day),datetime.time())+datetime.timedelta(minutes=minute)
  value=value.strftime('%Y-%m-%d %H:%M:%S')
 return str(value).replace('\\','\\\\').replace('\t','\\t').replace('\n','\\n').replace('\r','\\r').replace('\0','\\0')

def run(source,container,report):
 source=Path(source).resolve();db=sqlite3.connect(f'file:{source}?mode=ro',uri=True)
 parent=db.execute('SELECT id FROM dataset').fetchone()[0]
 revision=db.execute('SELECT definition_sha256 FROM schema_revision WHERE version=?',('commerce-2',)).fetchone()[0]
 identity=hashlib.sha256((parent+revision).encode()).hexdigest()
 plan=json.loads((Path(__file__).parent/'commerce-import-plan.json').read_text())
 lock=open('/tmp/skymetrics-commerce-import.lock','w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 report=Path(report);report.parent.mkdir(parents=True,exist_ok=True)
 previous=mysql(container,'SELECT DISTINCT source_id FROM cm_import_checkpoint;').split()
 if previous and previous!=[identity]:raise ValueError('Target already contains a different dataset revision')
 completed=set(tuple(x.split('\t')) for x in mysql(container,'SELECT table_name,chunk_number FROM cm_import_checkpoint;').splitlines())
 result={'dataset_id':parent,'revision':'commerce-2','source_identity':identity,'tables':{},'status':'IMPORTING'}
 started=time.monotonic()
 with tempfile.TemporaryDirectory(prefix='skymetrics-import-') as temp:
  tsv=Path(temp)/'chunk.tsv'
  for table in plan:
   name=table['target'];source_name=table['source'];count=db.execute(f'SELECT COUNT(*) FROM "{source_name}"').fetchone()[0]
   if not any(t==name for t,c in completed) and int(mysql(container,f'SELECT COUNT(*) FROM `{name}`;').strip()):raise ValueError(f'{name} already contains untracked rows')
   # Read in clustered primary-key order, keeping memory bounded.
   order=','.join('"'+c['source']+'"' for c in table['columns'] if c['name'] in table['pk'])
   cursor=db.execute(f'SELECT * FROM "{source_name}" ORDER BY {order}')
   chunk=0
   while True:
    rows=cursor.fetchmany(100000)
    if not rows:break
    if (name,str(chunk)) not in completed:
     with tsv.open('w') as stream:
      for row in rows:stream.write('\t'.join(encode(v,c['conversion']) for v,c in zip(row,table['columns']))+'\n')
     command(['docker','cp',str(tsv),container+':/var/lib/mysql-files/skymetrics_commerce_chunk.tsv'])
     command(['docker','exec',container,'chmod','644','/var/lib/mysql-files/skymetrics_commerce_chunk.tsv'])
     cols=','.join('`'+c['name']+'`' for c in table['columns'])
     sql=f"SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'; START TRANSACTION; LOAD DATA INFILE '/var/lib/mysql-files/skymetrics_commerce_chunk.tsv' INTO TABLE `{name}` CHARACTER SET utf8mb4 FIELDS TERMINATED BY '\\t' ESCAPED BY '\\\\' LINES TERMINATED BY '\\n' ({cols}); INSERT INTO cm_import_checkpoint(source_id,table_name,chunk_number,row_count) VALUES('{identity}','{name}',{chunk},{len(rows)}); COMMIT;"
     mysql(container,sql)
    chunk+=1
    if name=='cm_observation' and chunk%20==0:print(f'Observations: {min(chunk*100000,count):,}/{count:,}',flush=True)
   actual=int(mysql(container,f'SELECT COUNT(*) FROM `{name}`;').strip())
   if actual!=count:raise ValueError(f'Count mismatch in {name}: {actual} vs {count}')
   result['tables'][name]={'source_rows':count,'mysql_rows':actual}
   report.write_text(json.dumps(result,indent=2)+'\n')
   print(f'{name}: {actual:,} verified',flush=True)
 command(['docker','exec',container,'rm','-f','/var/lib/mysql-files/skymetrics_commerce_chunk.tsv'])
 mysql(container,'ANALYZE TABLE cm_service,cm_departure,cm_observation,cm_offer_policy;')
 result.update(status='IMPORTED_COUNTS_VERIFIED',elapsed_seconds=round(time.monotonic()-started,2))
 report.write_text(json.dumps(result,indent=2)+'\n');db.close();return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--container',required=True);p.add_argument('--report',required=True);a=p.parse_args();run(a.source,a.container,a.report)
