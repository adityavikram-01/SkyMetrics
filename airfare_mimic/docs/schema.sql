
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
