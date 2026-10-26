-- Synthetic behavioural calibration v1. No measured price elasticities are claimed.
-- Raw observations remain intact; this MERGE view adds no observation storage.
CREATE TABLE IF NOT EXISTS cm_fare_behaviour (
 service_id BIGINT PRIMARY KEY,
 competition_bp INT NOT NULL,
 frequency_bp INT NOT NULL,
 weekday_time_bp INT NOT NULL,
 weekend_time_bp INT NOT NULL,
 methodology VARCHAR(255) NOT NULL,
 FOREIGN KEY(service_id) REFERENCES cm_service(id),
 CHECK(competition_bp BETWEEN 9000 AND 11000),
 CHECK(frequency_bp BETWEEN 9500 AND 10500),
 CHECK(weekday_time_bp BETWEEN 8500 AND 11500),
 CHECK(weekend_time_bp BETWEEN 8500 AND 11500)
);
INSERT INTO cm_fare_behaviour
SELECT s.id,
 ROUND(10000*(1+0.12*(r.hhi-0.4))),
 ROUND(10000*(1-LEAST(0.035,GREATEST(0,(r.flights-8)*0.002)))),
 CASE WHEN s.departure_minute<360 OR s.departure_minute>=1320 THEN 9000
      WHEN s.route LIKE '%GOI%' OR s.route LIKE '%SXR%' THEN
        CASE WHEN s.departure_minute BETWEEN 480 AND 1079 THEN 10400 ELSE 9800 END
      WHEN s.departure_minute BETWEEN 360 AND 539 OR s.departure_minute BETWEEN 1020 AND 1259 THEN 10800
      ELSE 9800 END,
 CASE WHEN s.departure_minute<360 OR s.departure_minute>=1320 THEN 9200
      WHEN s.departure_minute BETWEEN 480 AND 1079 THEN 10400 ELSE 10000 END,
 'SIMULATED v1: schedule-share HHI, bounded frequency discount, local departure-time preference; not fitted real fare elasticities'
FROM cm_service s JOIN (
 SELECT route,SUM(n) flights,SUM(n*n)/POW(SUM(n),2) hhi
 FROM (SELECT route,airline,COUNT(*) n FROM cm_service GROUP BY route,airline) counts GROUP BY route
) r ON r.route=s.route
ON DUPLICATE KEY UPDATE competition_bp=VALUES(competition_bp),frequency_bp=VALUES(frequency_bp),
 weekday_time_bp=VALUES(weekday_time_bp),weekend_time_bp=VALUES(weekend_time_bp),methodology=VALUES(methodology);
CREATE OR REPLACE ALGORITHM=MERGE VIEW cm_priced_observation AS
SELECT o.departure_id,o.collection_date,o.horizon,o.outcome,
 ROUND(o.base_paise*(f.competition_bp/10000.0)*(f.frequency_bp/10000.0)*
 (CASE WHEN WEEKDAY(d.travel_date)>=5 THEN f.weekend_time_bp ELSE f.weekday_time_bp END/10000.0)) base_paise,
 ROUND(o.tax_paise*(f.competition_bp/10000.0)*(f.frequency_bp/10000.0)*
 (CASE WHEN WEEKDAY(d.travel_date)>=5 THEN f.weekend_time_bp ELSE f.weekday_time_bp END/10000.0)) tax_paise,
 o.fee_paise,o.bookable_seats,o.remaining_inventory,o.arrivals,o.cancellations
FROM cm_observation o JOIN cm_departure d ON d.id=o.departure_id
JOIN cm_fare_behaviour f ON f.service_id=d.service_id;
