package com.apix.analytics;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.apix.web.ApiException;

import java.time.*;
import java.util.*;

@Repository
public class ObservationStore {
    public record Observation(String resultId, String flightId, String route, String airline, String flightNumber,
                              LocalDate searchDate, LocalDate departureDate, Instant observedAt, Instant departureAt,
                              int horizon, String outcome, Double amount, String timeBand) {
    }

    private final JdbcTemplate jdbc;

    public ObservationStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public JdbcTemplate jdbc() {
        return jdbc;
    }

    public String dataset(String external) {
        if (external == null) throw new ApiException(400, "datasetId is required");
        var rows = jdbc.queryForList("SELECT id FROM dataset WHERE external_id=? AND synthetic=1", String.class, external);
        if (rows.isEmpty()) throw new ApiException(404, "Dataset not found");
        return rows.getFirst();
    }

    public LocalDate latest(String id) {
        var result = jdbc.queryForObject("SELECT MAX(collection_date) FROM collection_run WHERE dataset_id=?", java.sql.Date.class, id);
        if (result == null) throw new ApiException(422, "Dataset has no collections");
        return result.toLocalDate();
    }

    public LocalDate anchor(String id, LocalDate asOf) {
        var latest = latest(id);
        if (asOf != null && asOf.isAfter(latest)) throw new ApiException(400, "asOf cannot be after latest collection");
        return asOf == null ? latest : asOf;
    }

    public List<Observation> rows(String id, String route, String airline, LocalDate start, LocalDate end, LocalDate departureStart, LocalDate departureEnd) {
        return rows(id, route, airline, start, end, departureStart, departureEnd, null, null, null);
    }

    public List<Observation> rows(String id, String route, String airline, LocalDate start, LocalDate end, LocalDate departureStart, LocalDate departureEnd, Integer horizonMin, Integer horizonMax, Integer departureMonth) {
        if (start == null || end == null || start.isAfter(end) || start.plusDays(366).isBefore(end))
            throw new ApiException(400, "Search-date range must be 0–366 days");
        String fields = "SELECT cr.id,fd.external_id,rt.code,al.code,fs.flight_number,r.collection_date,fd.departure_date,r.observed_at,fd.departure_at,cr.horizon,cr.outcome,f.total_amount,fd.time_band ";
        StringBuilder sql;
        var args = new ArrayList<Object>();
        if (start.equals(end)) {
            // A single collection run contains only a few thousand results. Starting there
            // avoids traversing every historical departure for a date-specific request.
            sql = new StringBuilder(fields + "FROM collection_run r STRAIGHT_JOIN collection_result cr ON cr.run_id=r.id STRAIGHT_JOIN flight_departure fd ON fd.id=cr.departure_id JOIN flight_service fs ON fs.id=fd.service_id JOIN route rt ON rt.id=fs.route_id JOIN airline al ON al.id=fs.airline_id LEFT JOIN fare_observation f ON f.result_id=cr.id WHERE r.dataset_id=? AND r.collection_date=?");
            args.add(id);
            args.add(start);
            if (route != null) {
                sql.append(" AND rt.code=?");
                args.add(route);
            }
        } else if (route != null) {
            // Use the route's small service set to avoid scanning every route in a year of observations.
            sql = new StringBuilder(fields + "FROM route rt STRAIGHT_JOIN flight_service fs ON fs.route_id=rt.id STRAIGHT_JOIN flight_departure fd ON fd.service_id=fs.id STRAIGHT_JOIN collection_result cr ON cr.departure_id=fd.id STRAIGHT_JOIN collection_run r ON r.id=cr.run_id JOIN airline al ON al.id=fs.airline_id LEFT JOIN fare_observation f ON f.result_id=cr.id WHERE rt.code=? AND r.dataset_id=? AND r.collection_date BETWEEN ? AND ?");
            args.addAll(List.of(route, id, start, end));
        } else {
            sql = new StringBuilder(fields + "FROM collection_run r JOIN collection_result cr ON cr.run_id=r.id JOIN flight_departure fd ON fd.id=cr.departure_id JOIN flight_service fs ON fs.id=fd.service_id JOIN route rt ON rt.id=fs.route_id JOIN airline al ON al.id=fs.airline_id LEFT JOIN fare_observation f ON f.result_id=cr.id WHERE r.dataset_id=? AND r.collection_date BETWEEN ? AND ?");
            args.addAll(List.of(id, start, end));
        }
        if (airline != null) {
            sql.append(" AND al.code=?");
            args.add(airline);
        }
        if (departureStart != null) {
            sql.append(" AND fd.departure_date>=?");
            args.add(departureStart);
        }
        if (departureEnd != null) {
            sql.append(" AND fd.departure_date<=?");
            args.add(departureEnd);
        }
        if (horizonMin != null) {
            sql.append(" AND cr.horizon BETWEEN ? AND ?");
            args.add(horizonMin);
            args.add(horizonMax);
        }
        if (departureMonth != null) {
            sql.append(" AND MONTH(fd.departure_date)=?");
            args.add(departureMonth);
        }
        return jdbc.query(sql.toString(), (rs, n) -> new Observation(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getDate(6).toLocalDate(), rs.getDate(7).toLocalDate(), rs.getTimestamp(8).toInstant(), rs.getTimestamp(9).toInstant(), rs.getInt(10), rs.getString(11), rs.getObject(12) == null ? null : rs.getDouble(12), rs.getString(13)), args.toArray());
    }
}
