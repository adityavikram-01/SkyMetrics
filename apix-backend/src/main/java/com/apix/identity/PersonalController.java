package com.apix.identity;

import com.apix.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/me")
public class PersonalController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;

    public PersonalController(JdbcTemplate jdbc, PasswordEncoder passwords) { this.jdbc = jdbc; this.passwords = passwords; }

    public record TripRequest(@NotBlank String route, @NotNull LocalDate departureDate,
                              @DecimalMin("0") BigDecimal savedFare) {}
    public record WatchRequest(@NotBlank String route) {}
    public record SearchRequest(@NotBlank String route, @NotNull LocalDate departureDate) {}
    public record AlertRequest(@NotBlank String datasetId, @NotBlank String route,
                               @NotNull LocalDate departureDate, @NotNull @DecimalMin("0.01") BigDecimal threshold) {}
    public record Preferences(@Pattern(regexp="[A-Z]{3}") String homeAirport,
                              @Pattern(regexp="[A-Z0-9]{2}") String preferredAirline) {}
    public record ProfileUpdate(@NotBlank @Size(max=120) String name,
                                @Pattern(regexp="[A-Z]{3}") String homeAirport,
                                @Pattern(regexp="[A-Z0-9]{2}") String preferredAirline) {}
    public record PasswordUpdate(@NotBlank String currentPassword,
                                 @NotBlank @Size(min=12,max=128) String newPassword) {}

    @GetMapping("/profile")
    public Map<String,Object> profile(Authentication auth) {
        return jdbc.queryForMap("SELECT display_name AS name,email,role,home_airport AS homeAirport,preferred_airline AS preferredAirline,created_at AS createdAt FROM app_user WHERE id=?",userId(auth));
    }

    @PutMapping("/profile")
    public Map<String,String> updateProfile(@Valid @RequestBody ProfileUpdate body, Authentication auth) {
        jdbc.update("UPDATE app_user SET display_name=?,home_airport=?,preferred_airline=? WHERE id=?",body.name().trim(),body.homeAirport(),body.preferredAirline(),userId(auth));
        return Map.of("status","saved");
    }

    @PutMapping("/password")
    public Map<String,String> updatePassword(@Valid @RequestBody PasswordUpdate body, Authentication auth, HttpServletRequest request) {
        String id=userId(auth);
        String currentHash=jdbc.queryForObject("SELECT password_hash FROM app_user WHERE id=?",String.class,id);
        if(!passwords.matches(body.currentPassword(),currentHash)) throw new ApiException(400,"Current password is incorrect");
        jdbc.update("UPDATE app_user SET password_hash=? WHERE id=?",passwords.encode(body.newPassword()),id);
        var session=request.getSession(false);
        if(session!=null) session.invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("status","saved");
    }

    @GetMapping("/dashboard")
    public Map<String,Object> dashboard(Authentication auth) {
        String id = userId(auth);
        return Map.of("savedTrips", count("saved_trip",id), "watchedRoutes", count("route_watch",id),
                "activeAlerts", jdbc.queryForObject("SELECT COUNT(*) FROM price_alert WHERE user_id=? AND active=1", Integer.class,id),
                "recentSearches", count("search_history",id));
    }

    @GetMapping("/trips")
    public List<Map<String,Object>> trips(Authentication auth) {
        return jdbc.query("SELECT id,route_code,departure_date,saved_fare,created_at FROM saved_trip WHERE user_id=? ORDER BY created_at DESC",
                (rs,n) -> Map.<String,Object>of("id",rs.getString(1),"route",rs.getString(2),"departureDate",rs.getDate(3).toLocalDate(),
                        "savedFare",rs.getBigDecimal(4)==null?"":rs.getBigDecimal(4),"createdAt",rs.getTimestamp(5).toLocalDateTime()), userId(auth));
    }

    @PostMapping("/trips")
    @Transactional
    public Map<String,String> saveTrip(@Valid @RequestBody TripRequest body, Authentication auth) {
        checkRoute(body.route());
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO saved_trip(id,user_id,route_code,departure_date,saved_fare) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE saved_fare=VALUES(saved_fare)",
                id,userId(auth),body.route(),body.departureDate(),body.savedFare());
        return Map.of("status","saved");
    }

    @DeleteMapping("/trips/{id}")
    public Map<String,Boolean> removeTrip(@PathVariable String id, Authentication auth) {
        if (jdbc.update("DELETE FROM saved_trip WHERE id=? AND user_id=?",id,userId(auth))==0) throw new ApiException(404,"Trip not found");
        return Map.of("removed",true);
    }

    @GetMapping("/watchlist")
    public List<Map<String,Object>> watchlist(Authentication auth) {
        return jdbc.query("SELECT id,route_code,created_at FROM route_watch WHERE user_id=? ORDER BY created_at DESC",
                (rs,n) -> Map.of("id",rs.getString(1),"route",rs.getString(2),"createdAt",rs.getTimestamp(3).toLocalDateTime()), userId(auth));
    }

    @PostMapping("/watchlist")
    public Map<String,String> watch(@Valid @RequestBody WatchRequest body, Authentication auth) {
        checkRoute(body.route());
        jdbc.update("INSERT IGNORE INTO route_watch(id,user_id,route_code) VALUES(?,?,?)",UUID.randomUUID().toString(),userId(auth),body.route());
        return Map.of("status","watching");
    }

    @DeleteMapping("/watchlist/{id}")
    public Map<String,Boolean> unwatch(@PathVariable String id, Authentication auth) {
        if (jdbc.update("DELETE FROM route_watch WHERE id=? AND user_id=?",id,userId(auth))==0) throw new ApiException(404,"Watch not found");
        return Map.of("removed",true);
    }

    @GetMapping("/searches")
    public List<Map<String,Object>> searches(Authentication auth) {
        return jdbc.query("SELECT id,route_code,departure_date,last_searched_at FROM search_history WHERE user_id=? ORDER BY last_searched_at DESC LIMIT 20",
                (rs,n) -> Map.of("id",rs.getString(1),"route",rs.getString(2),"departureDate",rs.getDate(3).toLocalDate(),
                        "searchedAt",rs.getTimestamp(4).toLocalDateTime()),userId(auth));
    }

    @PostMapping("/searches")
    public Map<String,String> recordSearch(@Valid @RequestBody SearchRequest body, Authentication auth) {
        jdbc.update("INSERT INTO search_history(id,user_id,route_code,departure_date) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE last_searched_at=CURRENT_TIMESTAMP(6)",
                UUID.randomUUID().toString(),userId(auth),body.route(),body.departureDate());
        return Map.of("status","recorded");
    }

    @GetMapping("/alerts")
    public List<Map<String,Object>> alerts(Authentication auth) {
        return jdbc.query("SELECT a.id,r.code,a.departure_date,a.threshold,a.active FROM price_alert a JOIN route r ON r.id=a.route_id WHERE a.user_id=? ORDER BY a.departure_date",
                (rs,n) -> Map.of("id",rs.getString(1),"route",rs.getString(2),"departureDate",rs.getDate(3).toLocalDate(),
                        "threshold",rs.getBigDecimal(4),"active",rs.getBoolean(5)),userId(auth));
    }

    @PostMapping("/alerts")
    public Map<String,String> createAlert(@Valid @RequestBody AlertRequest body, Authentication auth) {
        checkRoute(body.route());
        String id=UUID.randomUUID().toString();
        int changed=jdbc.update("INSERT INTO price_alert(id,dataset_id,route_id,departure_date,threshold,active,user_id) " +
                        "SELECT ?,d.id,r.id,?,?,1,? FROM dataset d JOIN route r ON r.code=? WHERE d.external_id=?",
                id,body.departureDate(),body.threshold(),userId(auth),body.route(),body.datasetId());
        if(changed==0) throw new ApiException(404,"Dataset or route not found");
        return Map.of("id",id,"status","saved","delivery","IN_APP_ONLY");
    }

    @DeleteMapping("/alerts/{id}")
    public Map<String,Boolean> removeAlert(@PathVariable String id, Authentication auth) {
        if(jdbc.update("UPDATE price_alert SET active=0 WHERE id=? AND user_id=? AND active=1",id,userId(auth))==0)
            throw new ApiException(404,"Alert not found");
        return Map.of("removed",true);
    }

    @GetMapping("/notifications")
    public List<Map<String,Object>> notifications(Authentication auth) {
        return jdbc.query("SELECT n.id,r.code,n.amount,n.observed_at FROM alert_notification n JOIN price_alert a ON a.id=n.alert_id JOIN route r ON r.id=a.route_id WHERE a.user_id=? ORDER BY n.observed_at DESC LIMIT 30",
                (rs,n) -> Map.of("id",rs.getString(1),"route",rs.getString(2),"amount",rs.getBigDecimal(3),"observedAt",rs.getTimestamp(4).toLocalDateTime()),userId(auth));
    }

    @PutMapping("/preferences")
    public Map<String,String> preferences(@Valid @RequestBody Preferences body, Authentication auth) {
        jdbc.update("UPDATE app_user SET home_airport=?,preferred_airline=? WHERE id=?",body.homeAirport(),body.preferredAirline(),userId(auth));
        return Map.of("status","saved");
    }

    private int count(String table, String id) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE user_id=?",Integer.class,id); }
    private void checkRoute(String route) {
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM route WHERE code=?",Integer.class,route);
        if(count==null||count==0) throw new ApiException(404,"Route not found");
    }
    private String userId(Authentication auth) {
        if(auth==null||!auth.isAuthenticated()) throw new ApiException(401,"Sign in required");
        return jdbc.queryForObject("SELECT id FROM app_user WHERE email=?",String.class,auth.getName());
    }
}
