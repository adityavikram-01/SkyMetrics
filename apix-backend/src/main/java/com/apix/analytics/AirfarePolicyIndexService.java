package com.apix.analytics;

import com.apix.analytics.ObservationStore.Observation;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.RowCallbackHandler;

import java.time.LocalDate;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static com.apix.analytics.Statistics.median;
import static com.apix.analytics.Statistics.round;

/** A transparent prototype index over simulated observations, never an official CPI. */
@Service
public class AirfarePolicyIndexService {
    private static final int WINDOW_DAYS = 30;
    private static final int STANDARD_BOOKING_HORIZON = 21;
    private static final int BOOKING_TOLERANCE_DAYS = 3;
    private final ObservationStore store;
    private record CachedReport(Map<String, Object> value, Instant createdAt) {}
    private final Map<String, CachedReport> cachedReports = new ConcurrentHashMap<>();

    public AirfarePolicyIndexService(ObservationStore store) {
        this.store = store;
    }

    public Map<String, Object> report(String dataset, LocalDate asOf) {
        String id = store.dataset(dataset);
        LocalDate day = store.anchor(id, asOf);
        LocalDate first = Objects.requireNonNull(store.jdbc().queryForObject(
                "SELECT MIN(collection_date) FROM collection_run WHERE dataset_id=?", java.sql.Date.class, id)).toLocalDate();
        LocalDate latest = store.latest(id);
        String cacheKey = dataset + "|" + latest + "|" + day;
        CachedReport cached = cachedReports.get(cacheKey);
        if (cached != null && cached.createdAt().isAfter(Instant.now().minusSeconds(600))) return cached.value();
        LocalDate baseDate = latest.minusDays(WINDOW_DAYS);
        String[] model = store.jdbc().queryForObject("SELECT model_version,config_hash FROM dataset WHERE id=?",
                (rs, row) -> new String[]{rs.getString(1), rs.getString(2)}, id);
        Map<String, Object> window = Map.of("firstCollectionDate", first, "lastCollectionDate", latest,
                "firstIndexDate", baseDate, "fixedBaseDate", baseDate);
        if (baseDate.isBefore(first)) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("dataMode", "SIMULATED");
            response.put("datasetId", dataset);
            response.put("asOf", day);
            response.put("observationWindow", window);
            response.put("modelVersion", Objects.requireNonNull(model)[0]);
            response.put("configHash", model[1]);
            response.put("data", Map.of("status", "INSUFFICIENT_DATA", "reason", "Need at least 31 collection dates"));
            return response;
        }
        if (day.isBefore(baseDate)) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("dataMode", "SIMULATED");
            response.put("datasetId", dataset);
            response.put("asOf", day);
            response.put("observationWindow", window);
            response.put("modelVersion", Objects.requireNonNull(model)[0]);
            response.put("configHash", model[1]);
            response.put("data", Map.of("status", "INSUFFICIENT_DATA", "reason", "Selected date is outside the current fixed-base comparison window"));
            return response;
        }

        DailyCells daily = dailyCells(id, baseDate, latest);
        Map<LocalDate, Map<String, Double>> byDate = new LinkedHashMap<>();
        Map<LocalDate, Integer> observations = new LinkedHashMap<>();
        for (LocalDate date = baseDate; !date.isAfter(latest); date = date.plusDays(1)) {
            observations.put(date, daily.observations().getOrDefault(date, 0));
            byDate.put(date, daily.medians().getOrDefault(date, Map.of()));
        }
        Map<String, Integer> serviceCounts = new TreeMap<>();
        store.jdbc().query("SELECT r.code,COUNT(fs.id) FROM route r JOIN flight_service fs ON fs.route_id=r.id GROUP BY r.code",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> serviceCounts.put(rs.getString(1), rs.getInt(2)));
        Map<String, Object> response = calculate(dataset, day, baseDate, byDate, observations, serviceCounts);
        response.put("observationWindow", window);
        response.put("modelVersion", Objects.requireNonNull(model)[0]);
        response.put("configHash", model[1]);
        if (cachedReports.size() > 40) cachedReports.clear();
        cachedReports.put(cacheKey, new CachedReport(response, Instant.now()));
        return response;
    }

    private record DailyCells(Map<LocalDate, Map<String, Double>> medians, Map<LocalDate, Integer> observations) {}

    private DailyCells dailyCells(String id, LocalDate start, LocalDate end) {
        Map<LocalDate, Map<String, List<Double>>> values = new HashMap<>();
        Map<LocalDate, Integer> observations = new HashMap<>();
        String sql = "SELECT r.collection_date,rt.code,al.code,cr.horizon,fd.time_band,f.total_amount " +
                "FROM collection_run r STRAIGHT_JOIN collection_result cr ON cr.run_id=r.id " +
                "STRAIGHT_JOIN flight_departure fd ON fd.id=cr.departure_id " +
                "JOIN flight_service fs ON fs.id=fd.service_id JOIN route rt ON rt.id=fs.route_id " +
                "JOIN airline al ON al.id=fs.airline_id JOIN fare_observation f ON f.result_id=cr.id " +
                "WHERE r.dataset_id=? AND r.collection_date BETWEEN ? AND ? AND cr.horizon BETWEEN " + (STANDARD_BOOKING_HORIZON - BOOKING_TOLERANCE_DAYS) + " AND " + (STANDARD_BOOKING_HORIZON + BOOKING_TOLERANCE_DAYS) + " AND f.total_amount IS NOT NULL";
        store.jdbc().query(sql, (RowCallbackHandler) rs -> {
            LocalDate date = rs.getDate(1).toLocalDate();
            String cell = rs.getString(2) + "|" + rs.getString(3) + "|21-day-target|" + rs.getString(5);
            values.computeIfAbsent(date, ignored -> new HashMap<>())
                    .computeIfAbsent(cell, ignored -> new ArrayList<>()).add(rs.getDouble(6));
            observations.merge(date, 1, Integer::sum);
        }, id, start, end);
        Map<LocalDate, Map<String, Double>> medians = new HashMap<>();
        values.forEach((date, cells) -> {
            Map<String, Double> result = new HashMap<>();
            cells.forEach((cell, fares) -> result.put(cell, median(fares)));
            medians.put(date, result);
        });
        return new DailyCells(medians, observations);
    }

    static Map<String, Double> cellMedians(List<Observation> rows) {
        Map<String, List<Double>> values = new HashMap<>();
        for (Observation row : rows) {
            if (row.amount() != null && row.amount() > 0) {
                String key = row.route() + "|" + row.airline() + "|" + row.horizon() + "|" + row.timeBand();
                values.computeIfAbsent(key, ignored -> new ArrayList<>()).add(row.amount());
            }
        }
        Map<String, Double> result = new HashMap<>();
        values.forEach((key, fares) -> result.put(key, median(fares)));
        return result;
    }

    static Map<String, Object> calculate(String dataset, LocalDate day,
                                         Map<LocalDate, Map<String, Double>> byDate,
                                         Map<LocalDate, Integer> observations,
                                         Map<String, Integer> serviceCounts) {
        return calculate(dataset, day, day.minusDays(WINDOW_DAYS), byDate, observations, serviceCounts);
    }

    static Map<String, Object> calculate(String dataset, LocalDate day, LocalDate baseDate,
                                         Map<LocalDate, Map<String, Double>> byDate,
                                         Map<LocalDate, Integer> observations,
                                         Map<String, Integer> serviceCounts) {
        Map<String, Double> base = byDate.getOrDefault(baseDate, Map.of());
        Set<String> fixedCells = new HashSet<>(base.keySet());
        byDate.values().forEach(cells -> fixedCells.retainAll(cells.keySet()));
        Map<String, List<String>> routeCells = fixedCells.stream().collect(Collectors.groupingBy(
                key -> key.substring(0, key.indexOf('|')), TreeMap::new, Collectors.toList()));
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("dataMode", "SIMULATED");
        envelope.put("datasetId", dataset);
        envelope.put("asOf", day);
        if (fixedCells.size() < 20 || routeCells.isEmpty()) {
            envelope.put("data", Map.of("status", "INSUFFICIENT_DATA", "reason", "Fewer than 20 fare cells were available at every sampled date"));
            return envelope;
        }

        List<Map<String, Object>> series = new ArrayList<>();
        List<Map<String, Object>> routeSeries = new ArrayList<>();
        Map<LocalDate, Double> indexByDate = new HashMap<>();
        for (var entry : byDate.entrySet()) {
            double weighted = 0;
            double weightTotal = 0;
            for (var route : routeCells.entrySet()) {
                double relative = routeRelative(route.getValue(), entry.getValue(), base);
                int weight = serviceCounts.getOrDefault(route.getKey(), 1);
                weighted += relative * weight;
                weightTotal += weight;
            }
            double index = round(100 * weighted / weightTotal);
            indexByDate.put(entry.getKey(), index);
            series.add(Map.of("date", entry.getKey(), "index", index, "availableObservations", observations.getOrDefault(entry.getKey(), 0)));
            for (var route : routeCells.entrySet()) {
                double relative = routeRelative(route.getValue(), entry.getValue(), base);
                routeSeries.add(Map.of("date", entry.getKey(), "route", route.getKey(), "index", round(100 * relative)));
            }
        }

        List<Map<String, Object>> routes = new ArrayList<>();
        Map<String, Double> current = byDate.get(day);
        int totalWeight = routeCells.keySet().stream().mapToInt(route -> serviceCounts.getOrDefault(route, 1)).sum();
        for (var route : routeCells.entrySet()) {
            double relative = routeRelative(route.getValue(), current, base);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("route", route.getKey());
            item.put("index", round(100 * relative));
            item.put("changePercent", round(100 * (relative - 1)));
            item.put("dailyChangePercent", routeMovement(route.getValue(), current, byDate.get(day.minusDays(1)), base));
            item.put("weeklyChangePercent", routeMovement(route.getValue(), current, byDate.get(day.minusDays(7)), base));
            item.put("weightPercent", round(100.0 * serviceCounts.getOrDefault(route.getKey(), 1) / totalWeight));
            item.put("contributionPoints", round(100.0 * serviceCounts.getOrDefault(route.getKey(), 1) / totalWeight * (relative - 1)));
            item.put("matchedCells", route.getValue().size());
            routes.add(item);
        }
        routes.sort(Comparator.comparingDouble(item -> -((Number) item.get("changePercent")).doubleValue()));

        Map<String, List<Map<String, Object>>> byCity = routes.stream().collect(Collectors.groupingBy(
                item -> ((String) item.get("route")).substring(0, 3), TreeMap::new, Collectors.toList()));
        List<Map<String, Object>> cities = new ArrayList<>();
        byCity.forEach((city, items) -> {
            double weighted = items.stream().mapToDouble(item -> ((Number) item.get("index")).doubleValue() * ((Number) item.get("weightPercent")).doubleValue()).sum();
            double sum = items.stream().mapToDouble(item -> ((Number) item.get("weightPercent")).doubleValue()).sum();
            double index = round(weighted / sum);
            cities.add(Map.of("city", city, "index", index, "changePercent", round(index - 100), "coveredRoutes", items.size()));
        });
        cities.sort(Comparator.comparingDouble(item -> -((Number) item.get("changePercent")).doubleValue()));

        Map<String, Object> movements = new LinkedHashMap<>();
        for (var period : Map.of("daily", 1, "weekly", 7, "monthly", 30).entrySet()) {
            Double old = indexByDate.get(day.minusDays(period.getValue()));
            movements.put(period.getKey(), old == null ? null : round(100 * (indexByDate.get(day) / old - 1)));
        }
        Map<String, Object> coverage = new LinkedHashMap<>();
        coverage.put("fixedMatchedCells", fixedCells.size());
        coverage.put("coveredRoutes", routeCells.size());
        coverage.put("basketRoutes", serviceCounts.size());
        coverage.put("cellRetentionPercent", base.isEmpty() ? null : round(100.0 * fixedCells.size() / base.size()));
        coverage.put("availableObservationsToday", observations.getOrDefault(day, 0));
        coverage.put("sampledDates", byDate.size());
        coverage.put("basketRouteWeightTotal", totalWeight);
        coverage.put("excludedBaseCells", Math.max(0, base.size() - fixedCells.size()));
        coverage.put("excludedRoutes", serviceCounts.keySet().stream().filter(route -> !routeCells.containsKey(route)).sorted().toList());
        coverage.put("standardBookingHorizonDays", STANDARD_BOOKING_HORIZON);
        coverage.put("bookingHorizonToleranceDays", BOOKING_TOLERANCE_DAYS);
        coverage.put("qualityFlag", routeCells.size() < serviceCounts.size() || fixedCells.size() < base.size() * 0.6 ? "REVIEW_COVERAGE" : "COMPARABLE_WINDOW");

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "PROTOTYPE_ONLY");
        data.put("name", "SkyMetrics Airfare Price Index — simulated research prototype");
        data.put("baseDate", baseDate);
        data.put("baseIndex", 100);
        data.put("index", indexByDate.get(day));
        data.put("movements", movements);
        data.put("series", series);
        data.put("routeSeries", routeSeries);
        data.put("routes", routes);
        data.put("cities", cities);
        data.put("coverage", coverage);
        data.put("methodology", Map.of(
                "basket", "One fixed basket for all dates in the current 31-day published comparison window; base does not change when an analyst selects another date",
                "cell", "Median available fare for the same route, airline and departure-time band, quoted 18 to 24 days before departure around a 21-day target",
                "aggregation", "Geometric mean of fixed-cell price relatives within each route; route indices weighted arithmetically by scheduled service count",
                "weightSource", "Synthetic scheduled-service-count proxy; no observed passenger or expenditure weights",
                "limitations", "Simulation only. Travel weekday and fare-product quality are not yet held fixed; no passenger or expenditure weights. Not official CPI or measured inflation."));
        envelope.put("data", data);
        return envelope;
    }

    private static Double routeMovement(List<String> cells, Map<String, Double> current,
                                        Map<String, Double> previous, Map<String, Double> base) {
        if (previous == null) return null;
        double now = routeRelative(cells, current, base);
        double before = routeRelative(cells, previous, base);
        return round(100 * (now / before - 1));
    }

    private static double routeRelative(List<String> cells, Map<String, Double> current, Map<String, Double> base) {
        return Math.exp(cells.stream().mapToDouble(cell -> Math.log(current.get(cell) / base.get(cell))).average().orElseThrow());
    }
}
