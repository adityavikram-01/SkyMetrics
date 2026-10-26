"Load curated, dated public airline references into the existing commerce DB."
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from import_commerce_mysql import mysql
CONTAINER="apix-airfare-intelligence-database-1"
rows=json.loads((Path(__file__).parent/"public-flight-references.json").read_text())
sql="""CREATE TABLE IF NOT EXISTS cm_public_reference (
 id VARCHAR(120) PRIMARY KEY, airline VARCHAR(2) NOT NULL, kind VARCHAR(30) NOT NULL,
 payload JSON NOT NULL, source_url VARCHAR(500) NOT NULL, checked_on DATE NOT NULL,
 FOREIGN KEY(airline) REFERENCES cm_airline(code), KEY ix_reference_kind_airline(kind,airline)
); DELETE FROM cm_public_reference WHERE kind='SCHEDULE' AND airline='SG';"""
def q(value): return "CONVERT(X'"+str(value).encode().hex()+"' USING utf8mb4)"
for row in rows:
 values=[row['id'],row['airline'],row['kind'],json.dumps(row['payload']),row['source_url'],row['checked_on']]
 sql += " INSERT INTO cm_public_reference VALUES("+','.join(map(q,values))+") ON DUPLICATE KEY UPDATE payload=VALUES(payload),source_url=VALUES(source_url),checked_on=VALUES(checked_on);"
print(mysql(CONTAINER,sql))
print(mysql(CONTAINER,"SELECT kind,COUNT(*) FROM cm_public_reference GROUP BY kind ORDER BY kind;"))
