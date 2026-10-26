-- Run after completed import. Atomic, deterministic rebuild of the existing dataset's summaries.
START TRANSACTION;
DELETE FROM cm_route_day_summary;
INSERT INTO cm_route_day_summary
 (route,collection_date,attempts,available_count,total_paise,min_paise,max_paise)
SELECT s.route,o.collection_date,COUNT(*),SUM(o.outcome='AVAILABLE'),
 COALESCE(SUM(o.base_paise+o.tax_paise+o.fee_paise),0),
 MIN(o.base_paise+o.tax_paise+o.fee_paise),MAX(o.base_paise+o.tax_paise+o.fee_paise)
FROM cm_observation o JOIN cm_departure d ON d.id=o.departure_id
JOIN cm_service s ON s.id=d.service_id
WHERE o.horizon=21 GROUP BY s.route,o.collection_date;
COMMIT;
ANALYZE TABLE cm_route_day_summary;
