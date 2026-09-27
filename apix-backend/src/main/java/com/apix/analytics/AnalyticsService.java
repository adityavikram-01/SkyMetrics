package com.apix.analytics;

import static com.apix.analytics.Statistics.*;
import static com.apix.web.ApiException.require;

import com.apix.web.ApiException;
import com.apix.analytics.ObservationStore.Observation;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    private final ObservationStore store;

    public AnalyticsService(ObservationStore store) {
        this.store = store;
    }

    private List<Double> prices(List<Observation> rows) {
        return rows.stream().filter(r -> r.amount() != null).map(Observation::amount).toList();
    }

    private Map<String, Object> response(String dataset, LocalDate asOf, List<Observation> rows, Object data) {
        var m = new LinkedHashMap<String, Object>();
        m.put("dataMode", "SIMULATED");
        m.put("methodVersion", "analytics-0.1.0");
        m.put("datasetId", dataset);
        m.put("asOf", asOf);
        m.put("sampleCount", prices(rows).size());
        m.put("collectionResults", rows.size());
        m.put("collectionSuccessRate", rows.isEmpty() ? null : rows.stream().filter(r -> List.of("AVAILABLE", "SOLD_OUT", "NO_OFFER").contains(r.outcome())).count() / (double) rows.size());
        m.put("lastObservedAt", rows.stream().map(Observation::observedAt).max(Comparator.naturalOrder()).orElse(null));
        m.put("data", data);
        return m;
    }

    private Map<String, Object> insufficient(String reason) {
        return Map.of("status", "INSUFFICIENT_DATA", "reason", reason);
    }

    private Map<String, List<Observation>> group(List<Observation> rows, Function<Observation, String> key) {
        return rows.stream().collect(Collectors.groupingBy(key, TreeMap::new, Collectors.toList()));
    }

    public Map<String, Object> search(String dataset, String route, String airline, LocalDate departure, LocalDate asOf, int page, int size) {
        require(page >= 0 && page <= 100000 && size >= 1 && size <= 100, "page >=0; size 1..100");
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, route, airline, day, day, departure, departure);
        var available = rows.stream().filter(r -> r.amount() != null).sorted(Comparator.comparing(Observation::amount).thenComparing(Observation::flightId)).toList();
        return response(dataset, day, rows, Map.of("total", available.size(), "page", page, "size", size, "offers", available.stream().skip((long) page * size).limit(size).toList(), "outcomes", rows.stream().collect(Collectors.groupingBy(Observation::outcome, Collectors.counting()))));
    }

    public Map<String, Object> history(String dataset, String flight, LocalDate asOf) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, null, null, day.minusDays(365), day, null, null).stream().filter(r -> r.flightId().equals(flight)).sorted(Comparator.comparing(Observation::searchDate)).toList();
        return response(dataset, day, rows, rows.isEmpty() ? insufficient("Flight not observed in selected dataset") : Map.of("history", rows));
    }

    public Map<String, Object> intelligence(String dataset, String route, String airline, LocalDate departure, LocalDate asOf, Double quote) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        int h = (int) java.time.temporal.ChronoUnit.DAYS.between(day, departure);
        require(h >= 1 && h <= 45, "Departure must be T+1..T+45");
        require(quote == null || Double.isFinite(quote) && quote > 0, "Positive finite quote required");
        var current = store.rows(id, route, airline, day, day, departure, departure);
        var hist = store.rows(id, route, airline, day.minusDays(365), day.minusDays(1), null, day.minusDays(1), Math.max(1, h - 3), Math.min(45, h + 3), departure.getMonthValue()).stream().filter(r -> r.departureDate().getDayOfWeek() == departure.getDayOfWeek()).toList();
        var p = prices(hist);
        Double fare = quote != null ? quote : prices(current).stream().min(Double::compare).orElse(null);
        var data = new LinkedHashMap<String, Object>();
        if (p.size() < 20 || fare == null)
            return response(dataset, day, hist, insufficient("Need current quote and 20 same-month, same-weekday historical comparable offers; no silent fallback"));
        double percentile = p.stream().filter(v -> v < fare).count() / (double) p.size() * 100;
        data.put("currentFare", fare);
        data.put("historical", summarize(p));
        data.put("priceLevel", percentile <= 25 ? "LOW" : percentile >= 75 ? "HIGH" : "TYPICAL");
        data.put("farePercentile", round(percentile));
        data.put("dealScore", round(100 - percentile));
        data.put("differenceFromMedianPercent", round((fare / median(p) - 1) * 100));
        data.put("recommendation", percentile <= 25 ? "LOW_RELATIVE_TO_COMPARABLE_HISTORY" : "COMPARE_ALTERNATIVES");
        data.put("confidence", null);
        data.put("comparison", "Completed departures; same route, selected airline if supplied, same weekday/month, horizon ±3 days; score is percentile, not probability");
        return response(dataset, day, hist, data);
    }

    public Map<String, Object> calendar(String dataset, String route, LocalDate asOf) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, route, null, day, day, null, null);
        var dates = new ArrayList<Map<String, Object>>();
        group(rows, r -> r.departureDate().toString()).forEach((d, rs) -> {
            var p = prices(rs);
            var m = new LinkedHashMap<String, Object>();
            m.put("departureDate", d);
            m.put("lowestFare", p.stream().min(Double::compare).orElse(null));
            m.put("availableOffers", p.size());
            m.put("collectionResults", rs.size());
            dates.add(m);
        });
        return response(dataset, day, rows, dates);
    }

    public Map<String, Object> statistics(String dataset, String route, String airline, LocalDate asOf, int days) {
        require(days >= 1 && days <= 365, "days 1..365");
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, route, airline, day.minusDays(days - 1), day, null, null);
        var data = new LinkedHashMap<String, Object>();
        data.put("fares", summarize(prices(rows)));
        data.put("outcomes", rows.stream().collect(Collectors.groupingBy(Observation::outcome, Collectors.counting())));
        for (String dim : List.of("month", "weekday", "timeBand")) {
            Function<Observation, String> fn = switch (dim) {
                case "month" -> r -> r.departureDate().getMonth().toString();
                case "weekday" -> r -> r.departureDate().getDayOfWeek().toString();
                default -> Observation::timeBand;
            };
            var gs = new TreeMap<String, Object>();
            group(rows, fn).forEach((k, v) -> gs.put(k, summarize(prices(v))));
            data.put(dim, gs);
        }
        data.put("interpretation", "Descriptive mixed-horizon statistics, not causal effects");
        return response(dataset, day, rows, data);
    }

    public Map<String, Object> booking(String dataset, String route, String airline, LocalDate asOf) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var all = store.rows(id, route, airline, day.minusDays(365), day, null, day.minusDays(1));
        var cohorts = group(all, Observation::flightId).values().stream().filter(rs -> rs.stream().map(Observation::horizon).distinct().count() == 45).toList();
        var rows = cohorts.stream().flatMap(List::stream).toList();
        if (cohorts.size() < 20)
            return response(dataset, day, rows, insufficient("Need 20 completed departures with all 45 collection results"));
        var curve = new ArrayList<Map<String, Object>>();
        for (int h = 1; h <= 45; h++) {
            int k = h;
            var p = prices(rows.stream().filter(r -> r.horizon() == k).toList());
            var s = new LinkedHashMap<>(summarize(p));
            s.put("daysBeforeDeparture", h);
            curve.add(s);
        }
        var best = curve.stream().filter(m -> ((Number) m.get("count")).intValue() >= 20).min(Comparator.comparingDouble(m -> ((Number) m.get("median")).doubleValue())).orElse(null);
        var data = new LinkedHashMap<String, Object>();
        data.put("curve", curve);
        data.put("lowestMedianHorizon", best == null ? null : best.get("daysBeforeDeparture"));
        data.put("completedDepartureCohort", cohorts.size());
        data.put("bands", "P10/P90 are simulated dispersion, not confidence intervals; unavailable fares excluded");
        return response(dataset, day, rows, data);
    }

    public Map<String, Object> airlines(String dataset, String route, LocalDate asOf, int days) {
        require(days >= 1 && days <= 365, "days 1..365");
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, route, null, day.minusDays(days - 1), day, null, null);
        var carriers = group(rows, Observation::airline);
        var sets = new ArrayList<Set<String>>();
        for (var rs : carriers.values())
            sets.add(rs.stream().filter(r -> r.amount() != null).map(r -> r.searchDate() + "|" + r.departureDate() + "|" + r.horizon()).collect(Collectors.toSet()));
        var common = new HashSet<String>();
        if (!sets.isEmpty()) {
            common.addAll(sets.getFirst());
            sets.forEach(common::retainAll);
        }
        var result = new TreeMap<String, Object>();
        for (var e : carriers.entrySet()) {
            var matched = e.getValue().stream().filter(r -> common.contains(r.searchDate() + "|" + r.departureDate() + "|" + r.horizon())).toList();
            var cells = group(matched, r -> r.searchDate() + "|" + r.departureDate() + "|" + r.horizon());
            var medians = cells.values().stream().map(this::prices).filter(p -> !p.isEmpty()).map(Statistics::median).toList();
            result.put(e.getKey(), Map.of("matchedCellFares", summarize(medians), "dailyPriceMovements", movement(matched)));
        }
        return response(dataset, day, rows, Map.of("airlines", result, "matchedCells", common.size(), "method", "Equal weight per common search/departure/horizon cell. Departure-time mix can still differ."));
    }

    private Map<String, Object> movement(List<Observation> rows) {
        var changes = new ArrayList<Double>();
        for (var rs : group(rows, Observation::flightId).values()) {
            var sorted = rs.stream().sorted(Comparator.comparing(Observation::searchDate)).toList();
            for (int i = 1; i < sorted.size(); i++) {
                var a = sorted.get(i - 1);
                var b = sorted.get(i);
                if (a.amount() != null && b.amount() != null && a.searchDate().plusDays(1).equals(b.searchDate()))
                    changes.add((b.amount() / a.amount() - 1) * 100);
            }
        }
        if (changes.size() < 20) return insufficient("Need 20 consecutive available same-flight pairs");
        return Map.of("pairs", changes.size(), "riseFrequency", changes.stream().filter(v -> v > 0).count() / (double) changes.size(), "dropFrequency", changes.stream().filter(v -> v < 0).count() / (double) changes.size(), "unchangedFrequency", changes.stream().filter(v -> v == 0).count() / (double) changes.size(), "absoluteDailyMovementPercent", summarize(changes.stream().map(Math::abs).toList()));
    }

    public Map<String, Object> volatility(String dataset, String route, LocalDate asOf, int days) {
        require(days >= 2 && days <= 365, "days 2..365");
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, route, null, day.minusDays(days - 1), day, null, null);
        return response(dataset, day, rows, movement(rows));
    }

    public Map<String, Object> anomalies(String dataset, String route, LocalDate asOf) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var current = store.rows(id, route, null, day, day, null, null);
        var hist = store.rows(id, route, null, day.minusDays(90), day.minusDays(1), null, null);
        var buckets = group(hist, r -> r.route() + "|" + r.airline() + "|" + r.horizon() + "|" + r.timeBand());
        var result = new ArrayList<Map<String, Object>>();
        for (var r : current) {
            if (r.amount() == null) continue;
            var p = prices(buckets.getOrDefault(r.route() + "|" + r.airline() + "|" + r.horizon() + "|" + r.timeBand(), List.of()));
            if (p.size() < 20) continue;
            double lo = quantile(p, .25), hi = quantile(p, .75), iqr = hi - lo;
            if (iqr == 0) continue;
            if (r.amount() > hi + 3 * iqr || r.amount() < lo - 3 * iqr)
                result.add(Map.of("flightId", r.flightId(), "currentFare", r.amount(), "comparableMedian", median(p), "deviationPercent", round((r.amount() / median(p) - 1) * 100), "direction", r.amount() > hi ? "HIGH" : "LOW", "baselineCount", p.size()));
        }
        return response(dataset, day, current, Map.of("anomalies", result, "method", "3×IQR beyond Q1/Q3; same route/airline/horizon/time band; preceding 90 search days"));
    }

    private Map<String, Double> cells(List<Observation> rows) {
        var out = new TreeMap<String, Double>();
        group(rows.stream().filter(r -> r.amount() != null).toList(), r -> r.route() + "|" + r.airline() + "|" + r.horizon() + "|" + r.timeBand()).forEach((k, v) -> out.put(k, median(prices(v))));
        return out;
    }

    private Map<String, Object> compareIndex(List<Observation> base, List<Observation> current) {
        var a = cells(base);
        var b = cells(current);
        var ratios = new TreeMap<String, List<Double>>();
        int matched = 0;
        for (var e : a.entrySet())
            if (b.containsKey(e.getKey())) {
                ratios.computeIfAbsent(e.getKey().split("\\|")[0], k -> new ArrayList<>()).add(b.get(e.getKey()) / e.getValue());
                matched++;
            }
        if (matched < 20) return insufficient("Need 20 matched route/airline/horizon/time cells");
        var routes = new TreeMap<String, Double>();
        ratios.forEach((k, v) -> routes.put(k, v.stream().mapToDouble(x -> x).average().orElseThrow()));
        double idx = routes.values().stream().mapToDouble(x -> x).average().orElseThrow() * 100;
        var changes = new TreeMap<String, Double>();
        routes.forEach((k, v) -> changes.put(k, round((v - 1) * 100)));
        return Map.of("baseIndex", 100, "index", round(idx), "changePercent", round(idx - 100), "matchedCells", matched, "baseCells", a.size(), "currentCells", b.size(), "coveredRoutes", routes.size(), "routeChanges", changes);
    }

    public Map<String, Object> index(String dataset, LocalDate asOf, String city) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var rows = store.rows(id, null, null, day.minusDays(30), day, null, null).stream().filter(r -> city == null || r.route().startsWith(city + "-")).toList();
        var byDay = group(rows, r -> r.searchDate().toString());
        var current = byDay.getOrDefault(day.toString(), List.of());
        var out = new LinkedHashMap<String, Object>();
        for (var e : Map.of("daily", 1, "weekly", 7, "monthly", 30).entrySet())
            out.put(e.getKey(), compareIndex(byDay.getOrDefault(day.minusDays(e.getValue()).toString(), List.of()), current));
        out.put("yearly", insufficient("No complete prior-year comparison in 365-day dataset"));
        out.put("weighting", "Equal route weights; equal matched cell weights within route. Pairwise basket can vary; not an official India index.");
        return response(dataset, day, rows, out);
    }

    public Map<String, Object> heatmap(String dataset, LocalDate asOf, int lag) {
        require(lag >= 1 && lag <= 365, "lagDays 1..365");
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var current = store.rows(id, null, null, day, day, null, null);
        var base = store.rows(id, null, null, day.minusDays(lag), day.minusDays(lag), null, null);
        return response(dataset, day, current, compareIndex(base, current));
    }

    public Map<String, Object> events(String dataset, String name, String route, LocalDate asOf) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        var eventRows = store.jdbc().queryForList("SELECT e.event_date,e.window_start,e.window_end,r.code FROM calendar_event e JOIN route r ON r.id=e.route_id WHERE e.dataset_id=? AND e.name=?" + (route == null ? "" : " AND r.code=?"), route == null ? new Object[]{id, name} : new Object[]{id, name, route});
        var output = new ArrayList<Map<String, Object>>();
        var used = new ArrayList<Observation>();
        for (var event : eventRows) {
            var start = ((java.sql.Date) event.get("window_start")).toLocalDate();
            var end = ((java.sql.Date) event.get("window_end")).toLocalDate();
            String rc = (String) event.get("code");
            var all = store.rows(id, rc, null, day.minusDays(365), day, start.minusDays(28), end);
            var ev = all.stream().filter(r -> !r.departureDate().isBefore(start) && !r.departureDate().isAfter(end)).toList();
            var baseline = all.stream().filter(r -> !r.departureDate().isBefore(start.minusDays(28)) && !r.departureDate().isAfter(end.minusDays(28))).toList();
            Function<Observation, String> key = r -> r.airline() + "|" + r.horizon() + "|" + r.timeBand() + "|" + r.departureDate().getDayOfWeek();
            var bg = group(baseline, key);
            var eg = group(ev, key);
            var ratios = new ArrayList<Double>();
            int pairs = 0;
            for (var e : eg.entrySet()) {
                var p = prices(e.getValue());
                var bp = prices(bg.getOrDefault(e.getKey(), List.of()));
                if (p.size() >= 3 && bp.size() >= 3) {
                    ratios.add(median(p) / median(bp));
                    pairs += p.size();
                }
            }
            var result = new LinkedHashMap<String, Object>();
            result.put("route", rc);
            result.put("event", name);
            result.put("windowStart", start);
            result.put("windowEnd", end);
            result.put("matchedCells", ratios.size());
            result.put("eventAvailableCount", prices(ev).size());
            result.put("baselineAvailableCount", prices(baseline).size());
            result.put("upliftPercent", ratios.size() < 5 ? null : round((ratios.stream().mapToDouble(x -> x).average().orElseThrow() - 1) * 100));
            result.put("status", ratios.size() < 5 ? "INSUFFICIENT_DATA" : "OK");
            output.add(result);
            used.addAll(ev);
        }
        return response(dataset, day, used, Map.of("comparisons", output, "method", "28-day earlier weekday-aligned baseline, matched airline/horizon/time band; baseline may contain other events; association, not causal impact"));
    }

    public Map<String, Object> prediction(String dataset, String route, String airline, LocalDate departure, LocalDate asOf) {
        String id = store.dataset(dataset);
        var day = store.anchor(id, asOf);
        int h = (int) java.time.temporal.ChronoUnit.DAYS.between(day, departure);
        require(h >= 1 && h <= 45, "Departure must be T+1..T+45");
        var current = store.rows(id, route, airline, day, day, departure, departure).stream().filter(r -> r.amount() != null).min(Comparator.comparing(Observation::amount));
        if (current.isEmpty()) return response(dataset, day, List.of(), insufficient("No currently available offer"));
        var selected = current.get();
        var hist = store.rows(id, route, selected.airline(), day.minusDays(365), day.minusDays(1), null, day.minusDays(1));
        var byFlight = group(hist, Observation::flightId);
        var forecasts = new TreeMap<String, Object>();
        for (int ahead : new int[]{1, 3, 7}) {
            if (h - ahead < 1) {
                forecasts.put("next" + ahead + "Days", insufficient("Forecast extends beyond supported pre-departure horizon"));
                continue;
            }
            var ratios = new ArrayList<Double>();
            for (var rs : byFlight.values()) {
                Observation a = null, b = null;
                for (var r : rs) {
                    if (r.horizon() == h) a = r;
                    if (r.horizon() == h - ahead) b = r;
                }
                if (a != null && b != null && a.amount() != null && b.amount() != null && a.timeBand().equals(selected.timeBand()) && a.departureDate().getDayOfWeek() == departure.getDayOfWeek())
                    ratios.add(b.amount() / a.amount());
            }
            if (ratios.size() < 20)
                forecasts.put("next" + ahead + "Days", insufficient("Need 20 completed same-flight transition pairs"));
            else
                forecasts.put("next" + ahead + "Days", Map.of("estimatedMedian", round(selected.amount() * median(ratios)), "empiricalP10", round(selected.amount() * quantile(ratios, .1)), "empiricalP90", round(selected.amount() * quantile(ratios, .9)), "historicalIncreaseFrequency", ratios.stream().filter(x -> x > 1).count() / (double) ratios.size(), "historicalDecreaseFrequency", ratios.stream().filter(x -> x < 1).count() / (double) ratios.size(), "historicalUnchangedFrequency", ratios.stream().filter(x -> x == 1).count() / (double) ratios.size(), "pairs", ratios.size()));
        }
        return response(dataset, day, hist, Map.of("status", "EXPERIMENTAL", "flightId", selected.flightId(), "currentFare", selected.amount(), "forecasts", forecasts, "method", "Historical matched transition ratios from completed departures before asOf; empirical bands, not calibrated confidence intervals; no real-world accuracy claim"));
    }
}
