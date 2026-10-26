package com.apix.commerce;
import com.apix.web.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class TravellerSelectionService {
 private final JdbcTemplate db; private final JdbcTemplate commerce; private final ObjectMapper json;
 public TravellerSelectionService(JdbcTemplate db,@org.springframework.beans.factory.annotation.Qualifier("commerceJdbc") JdbcTemplate commerce,ObjectMapper json) {this.db=db;this.commerce=commerce;this.json=json;}
 private String user(String email) { return db.queryForObject("SELECT id FROM app_user WHERE email=?",String.class,email); }
 private void kind(String kind) { if(!Set.of("saved","alerts").contains(kind)) throw new ApiException(400,"Unknown selection type"); }
 public List<Object> list(String kind,String email) {
  kind(kind);return db.query("SELECT payload FROM traveller_selection WHERE user_id=? AND kind=? ORDER BY created_at DESC",(r,n)-> {
   try {var entry=json.readValue(r.getString(1),Map.class); if(kind.equals("alerts")) checkAlert(entry); return entry;} catch(Exception e) {throw new IllegalStateException("Invalid saved selection",e);}
  },user(email),kind);
 }
 @Transactional public Map<String,String> save(String kind,List<Map<String,Object>> entries,String email) throws Exception {
  kind(kind); if(entries.size()>(kind.equals("alerts")?20:100)) throw new ApiException(400,"Keep up to 100 saved selections.");
  String owner=user(email);var keys=new HashSet<String>();
  for(var entry:entries) {
   if(entry==null) throw new ApiException(400,"Invalid selection.");
   String key=String.valueOf(entry.get(kind.equals("saved")?"key":"id"));
   String route=String.valueOf(entry.get("route"));String payload=json.writeValueAsString(entry);
   try {
    java.time.LocalDate.parse(String.valueOf(entry.get("date")));
    if(!Set.of("ECONOMY","PREMIUM_ECONOMY","BUSINESS").contains(String.valueOf(entry.get("cabin")))) throw new Exception();
    var party=(Map<?,?>)entry.get("party");int a=((Number)party.get("adults")).intValue(),c=((Number)party.get("children")).intValue(),i=((Number)party.get("infants")).intValue();
    if(((Number)party.get("adults")).doubleValue()!=a||((Number)party.get("children")).doubleValue()!=c||((Number)party.get("infants")).doubleValue()!=i||a<1||c<0||i<0||a+c>9||i>a) throw new Exception();
    if(kind.equals("alerts") && ((Number)entry.get("target")).longValue()<=0) throw new Exception();
   } catch(Exception e) {throw new ApiException(400,"Choose valid travellers, cabin, date and target.");}
   if(key.equals("null")||key.length()>255||!keys.add(key)||payload.length()>8000||!route.matches("[A-Z]{3}-[A-Z]{3}")) throw new ApiException(400,"Invalid saved selection.");
   if(commerce.queryForObject("SELECT COUNT(*) FROM cm_route WHERE code=?",Integer.class,route)==0) throw new ApiException(400,"Unknown route.");
  }
  db.update("DELETE FROM traveller_selection WHERE user_id=? AND kind=?",owner,kind);
  for(var entry:entries) db.update("INSERT INTO traveller_selection(id,user_id,kind,selection_key,payload) VALUES(?,?,?,?,?)",UUID.randomUUID().toString(),owner,kind,String.valueOf(entry.get(kind.equals("saved")?"key":"id")),json.writeValueAsString(entry));
  return Map.of("status","saved");
 }
 private void checkAlert(Map<String,Object> entry) {
  var party=(Map<String,Number>)entry.get("party");
  int adults=party.get("adults").intValue(),children=party.get("children").intValue(),infants=party.get("infants").intValue();
  var date=java.time.LocalDate.parse(entry.get("date").toString());
  int flex=Boolean.TRUE.equals(entry.get("flex"))?7:0;
  var observed=commerce.queryForObject("SELECT MAX(collection_date) FROM cm_route_day_summary",java.time.LocalDate.class);
  var matches=commerce.queryForList("""
   SELECT d.travel_date matchDate,s.airline matchAirline,s.flight_number matchFlight,?*(ROUND(ROUND(o.base_paise*c.price_multiplier_bp/10000)*p.adult_multiplier_bp/10000)+o.tax_paise+o.fee_paise+p.surcharge_paise)
    +?*(ROUND(ROUND(o.base_paise*c.price_multiplier_bp/10000)*p.child_multiplier_bp/10000)+o.tax_paise+o.fee_paise+p.surcharge_paise)+?*p.infant_fee_paise matchPrice
   FROM cm_service s JOIN cm_departure d ON d.service_id=s.id
   JOIN cm_observation o ON o.departure_id=d.id AND o.collection_date=?
   JOIN cm_service_cabin c ON c.service_id=s.id AND c.cabin=?
   JOIN cm_offer_policy p ON p.airline=s.airline AND p.cabin=c.cabin
   WHERE s.route=? AND d.travel_date BETWEEN ? AND ? AND o.outcome='AVAILABLE'
   AND (CASE WHEN c.cabin='ECONOMY' THEN o.bookable_seats-COALESCE((SELECT SUM(FLOOR(o.bookable_seats*sc.capacity/s.capacity)) FROM cm_service_cabin sc WHERE sc.service_id=s.id AND sc.cabin<>'ECONOMY'),0)
    ELSE FLOOR(o.bookable_seats*c.capacity/s.capacity) END)>=? ORDER BY matchPrice,d.departure_at LIMIT 1
   """,adults,children,infants,observed,entry.get("cabin"),entry.get("route"),date.minusDays(flex),date.plusDays(flex),adults+children);
  entry.remove("matchPrice");entry.remove("matchDate");entry.remove("matchAirline");entry.remove("matchFlight");
  if(!matches.isEmpty()) entry.putAll(matches.getFirst());entry.put("checkedOn",observed.toString());
 }

}
