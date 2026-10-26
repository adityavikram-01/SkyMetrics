"""Start the local app with the existing identity store and imported Docker commerce data."""
import json, os, subprocess, time
from pathlib import Path
root = Path(__file__).resolve().parents[1]
container = "apix-airfare-intelligence-database-1"
if subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
 subprocess.run(["open", "-a", "Docker"], check=True)
 for attempt in range(45):
  if subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0: break
  time.sleep(1)
 else: raise SystemExit("Docker did not start. Open Docker Desktop, then run START_SKYMETRICS again.")
subprocess.run(["docker", "start", container], check=True, stdout=subprocess.DEVNULL)
config = json.loads(subprocess.check_output(["docker", "inspect", container]))[0]
values = dict(item.split("=", 1) for item in config["Config"]["Env"] if "=" in item)
env = os.environ.copy()
env.update(COMMERCE_DB_URL="jdbc:mysql://127.0.0.1:3308/"+values["MYSQL_DATABASE"]+"?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true", COMMERCE_DB_USERNAME=values["MYSQL_USER"], COMMERCE_DB_PASSWORD=values["MYSQL_PASSWORD"])
env["SKYMETRICS_MIMIC_PATH"] = str(root.parent / "airfare_mimic/output/final/airfare.sqlite")
os.chdir(root)
os.execvpe(str(root / "mvnw"), [str(root / "mvnw"), "spring-boot:run"], env)
