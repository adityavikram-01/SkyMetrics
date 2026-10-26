package com.apix.commerce;

import com.apix.web.ApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

/** Read-only, bounded queries over the final commerce dataset. Money stays in paise. */
@Service
@Transactional(readOnly=true)
public class TravellerData {
 private final JdbcTemplate db;
 public TravellerData(@org.springframework.beans.factory.annotation.Qualifier("commerceJdbc") JdbcTemplate db) { this.db=db; }
 public LocalDate asOf() {
  LocalDate date=db.queryForObject("SELECT MAX(collection_date) FROM cm_route_day_summary", LocalDate.class);
  if(date==null) throw new ApiException(503,"The flight dataset is not available yet.");
  return date;
 }
 public Map<String,Object> search(String route, LocalDate travel) {
  if(route==null || !route.matches("[A-Z]{3}-[A-Z]{3}") || db.queryForObject("SELECT COUNT(*) FROM cm_route WHERE code=?",Integer.class,route)==0)
   throw new ApiException(400,"Choose an available route.");
  LocalDate observed=asOf();
  if(travel==null) travel=observed.plusDays(21);
  if(!travel.isAfter(observed) || travel.isAfter(observed.plusDays(60))) throw new ApiException(400,"Choose a date within the dataset's 60-day booking window.");
  LocalDate start=travel.minusDays(7).isAfter(observed)?travel.minusDays(7):observed.plusDays(1);
  LocalDate end=travel.plusDays(7).isBefore(observed.plusDays(60))?travel.plusDays(7):observed.plusDays(60);
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("selectedDate",travel);result.put("asOf",observed);result.put("start",observed.plusDays(1));result.put("end",observed.plusDays(60));
  result.put("calendarStart",start);result.put("calendarEnd",end);result.put("simulated",true);
  result.put("fareModelVersion","synthetic-behaviour-1");
  result.put("datasetId",db.queryForObject("SELECT id FROM cm_dataset LIMIT 1",String.class));
  result.put("airports",db.queryForList("SELECT code,name FROM cm_airport ORDER BY name"));
  result.put("airlines",db.queryForList("SELECT code,name FROM cm_airline ORDER BY name"));
  result.put("routes",db.queryForList("SELECT code FROM cm_route ORDER BY code",String.class));
  Map<String,Object> services=new LinkedHashMap<>();
  var cabins=db.queryForList("SELECT service_id,cabin,capacity,price_multiplier_bp FROM cm_service_cabin");
  for(var s:db.queryForList("SELECT id,route,airline,flight_number,capacity,aircraft FROM cm_service")) {
   s.put("cabins",cabins.stream().filter(c->c.get("service_id").equals(s.get("id"))).toList());services.put(s.get("id").toString(),s);
  }
  result.put("services",services);
  result.put("publicReferences",db.queryForList("SELECT airline,kind,CAST(payload AS CHAR) payload,source_url,checked_on FROM cm_public_reference WHERE kind IN ('CERTIFICATION','SEAT_CONFIGURATION') ORDER BY airline,kind,id"));

  result.put("policies",db.queryForList("SELECT * FROM cm_offer_policy"));
  Map<String,Object> ratings=new LinkedHashMap<>();
  db.queryForList("SELECT airline,JSON_UNQUOTE(JSON_EXTRACT(payload,'$.value')) score FROM cm_public_reference WHERE kind='CERTIFICATION'").forEach(r->ratings.put(r.get("airline").toString(),r.get("score")));
  result.put("ratings",ratings);
  // Direct calendar plus all feasible first/second legs; no full observation-table scan.
  result.put("flights",db.query("""
   SELECT d.id,d.service_id,d.travel_date,d.departure_at,d.arrival_at,o.base_paise,o.tax_paise,o.fee_paise,o.bookable_seats
   FROM cm_service s JOIN cm_departure d ON d.service_id=s.id
   JOIN cm_priced_observation o ON o.departure_id=d.id AND o.collection_date=?
   WHERE (s.route=? OR s.route LIKE ? OR s.route LIKE ?) AND d.travel_date BETWEEN ? AND ? AND o.outcome='AVAILABLE'
   ORDER BY d.travel_date,d.id LIMIT 15000
   """,(r,n)->Map.<String,Object>of("id",r.getLong(1),"service",r.getLong(2),"date",r.getDate(3).toLocalDate(),
    "departure",r.getTimestamp(4).toLocalDateTime().toInstant(ZoneOffset.UTC).toString(),"arrival",r.getTimestamp(5).toLocalDateTime().toInstant(ZoneOffset.UTC).toString(),
    "base",r.getLong(6),"tax",r.getLong(7),"fee",r.getLong(8),"seats",r.getInt(9)),observed,route,route.substring(0,3)+"-%","%-"+route.substring(4),start,end.plusDays(1)));
  var history=db.queryForList("""
   WITH fares AS (
    SELECT o.horizon,(o.base_paise+o.tax_paise+o.fee_paise) price,
     ROW_NUMBER() OVER(PARTITION BY o.horizon ORDER BY o.base_paise+o.tax_paise+o.fee_paise) rn,
     COUNT(*) OVER(PARTITION BY o.horizon) cnt
    FROM cm_service s JOIN cm_departure d ON d.service_id=s.id JOIN cm_priced_observation o ON o.departure_id=d.id
    WHERE s.route=? AND d.travel_date BETWEEN ? AND ? AND o.horizon IN(1,7,14,21,30,45) AND o.outcome='AVAILABLE'
   ) SELECT horizon days,ROUND(AVG(price)) median,MAX(cnt) count FROM fares
     WHERE rn IN(FLOOR((cnt+1)/2),FLOOR((cnt+2)/2)) GROUP BY horizon ORDER BY horizon
   """,route,observed.minusDays(30),observed.minusDays(1));
  result.put("history",Map.of(route,history));
  return result;
 }
 public Map<String,Object> trends(int days) {
  if(!Set.of(1,7,30).contains(days)) throw new ApiException(400,"Choose 1, 7 or 30 days.");
  LocalDate date=asOf();
  return Map.of("asOf",date,"days",days,"simulated",true,"routes",db.queryForList("""
   WITH summaries AS (
    SELECT s.route,o.collection_date,COUNT(*) available_count,
     SUM(o.base_paise+o.tax_paise+o.fee_paise) total_paise
    FROM cm_priced_observation o JOIN cm_departure d ON d.id=o.departure_id
    JOIN cm_service s ON s.id=d.service_id
    WHERE o.collection_date IN (?,?) AND o.horizon=21 AND o.outcome='AVAILABLE'
    GROUP BY s.route,o.collection_date
   )
   SELECT a.route,a.available_count samples,b.available_count previousSamples,
   ROUND(a.total_paise/a.available_count) currentFare,ROUND(b.total_paise/b.available_count) previousFare,
   ROUND(100*((a.total_paise/a.available_count)/(b.total_paise/b.available_count)-1),1) changePct
   FROM summaries a JOIN summaries b ON a.route=b.route AND a.collection_date>b.collection_date
   ORDER BY changePct DESC
   """,date,date.minusDays(days)));
 }
}
