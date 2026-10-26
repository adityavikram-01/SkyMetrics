package com.apix.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Read-only, role-protected analysis of the generated research snapshot. */
@RestController
@RequestMapping("/api/v1/government/research")
public class GovernmentResearchController {
    private final Map<String, Object> snapshot;
    private final List<Map<String, Object>> series;

    @SuppressWarnings("unchecked")
    public GovernmentResearchController(ObjectMapper mapper) throws IOException {
        try (var input = new ClassPathResource("government-snapshot.json").getInputStream()) {
            snapshot = mapper.readValue(input, new TypeReference<>() {});
        }
        series = (List<Map<String, Object>>) snapshot.get("series");
    }

    @GetMapping
    public Map<String, Object> report(@RequestParam(required = false) LocalDate asOf) {
        LocalDate selected = asOf == null ? LocalDate.parse((String) snapshot.get("lastCollectionDate")) : asOf;
        int position = -1;
        for (int i = 0; i < series.size(); i++) {
            if (series.get(i).get("date").equals(selected.toString())) { position = i; break; }
        }
        if (position < 0) throw new ApiException(400, "Date outside the simulated collection window");
        var today = series.get(position);
        var previous = position > 0 ? series.get(position - 1) : null;
        var week = position >= 7 ? series.get(position - 7) : null;
        var month = position >= 30 ? series.get(position - 30) : null;
        var quality = qualityFor(position);
        Map<String, Object> report = new LinkedHashMap<>();
        for (String key : List.of("dataMode", "status", "datasetId", "modelVersion", "configHash", "firstCollectionDate", "lastCollectionDate", "baseDate", "baseIndex", "fixedMatchedCells", "basketRoutes", "methodology")) report.put(key, snapshot.get(key));
        report.put("asOf", selected);
        report.put("index", today.get("index"));
        Map<String, Object> movements = new LinkedHashMap<>();
        movements.put("daily", movement(today, previous));
        movements.put("weekly", movement(today, week));
        movements.put("monthly", movement(today, month));
        report.put("movements", movements);
        report.put("series", series.subList(0, position + 1).stream().map(row -> Map.of("date", row.get("date"), "index", row.get("index"), "available21DayQuotes", row.get("available21DayQuotes"), "carriedCells", row.get("carriedCells"))).toList());
        var routeRows = routes(today, previous, week, month);
        report.put("routes", routeRows);
        report.put("cities", cities(routeRows));
        report.put("directionalPairs", directionalPairs(routeRows));
        report.put("quality", quality);
        report.put("sourceAudit", Map.of("source", "SkyMetrics synthetic generator", "sourcesChecked", 0,
                "liveCollection", false, "simulatedObservedAt", quality.get("simulatedObservedAt"),
                "externalLastCheckedAt", "Not applicable: no external source contacted"));
        report.put("indexEligibility", eligibility(today, quality));
        report.put("routeQuality", ((Map<String, Object>) snapshot.get("routeQuality")).get(selected.toString()));
        report.put("qualitySeries", ((List<?>) snapshot.get("quality")).subList(Math.max(0, position - 29), position + 1));
        boolean latestCohort = selected.toString().equals(snapshot.get("lastCollectionDate"));
        report.put("leadTime", latestCohort ? snapshot.get("leadTime") : Map.of());
        report.put("airlineTime", latestCohort ? snapshot.get("airlineTime") : Map.of());
        report.put("seasonality", latestCohort ? snapshot.get("seasonality") : Map.of());
        report.put("latestCohortDate", snapshot.get("lastCollectionDate"));
        report.put("events", ((List<Map<String, Object>>) snapshot.get("events")).stream().filter(row -> ((String) row.get("date")).compareTo(selected.toString()) <= 0).toList());
        return report;
    }

    @GetMapping("/routes/{route}")
    @SuppressWarnings("unchecked")
    public Map<String, Object> routeInvestigation(@PathVariable String route,
                                                   @RequestParam(required = false) LocalDate asOf) {
        Map<String, Object> national = report(asOf);
        Map<String, Object> selected = ((List<Map<String, Object>>) national.get("routes")).stream()
                .filter(item -> route.equals(item.get("route"))).findFirst()
                .orElseThrow(() -> new ApiException(404, "Route is not covered by this research basket"));
        String selectedDate = national.get("asOf").toString();
        Map<String, Map<String, Map<String, Object>>> allQuality =
                (Map<String, Map<String, Map<String, Object>>>) snapshot.get("routeQuality");
        List<Map<String, Object>> history = new ArrayList<>();
        for (Map<String, Object> day : series) {
            String dayDate = (String) day.get("date");
            if (dayDate.compareTo(selectedDate) > 0) break;
            var point = new LinkedHashMap<String, Object>();
            point.put("date", dayDate);
            point.put("routeIndex", ((Map<String, Number>) day.get("routes")).get(route));
            point.put("nationalIndex", day.get("index"));
            point.put("available", ((Number) allQuality.get(dayDate).get(route).get("available")).intValue());
            history.add(point);
        }
        List<Map<String, Object>> cells = new ArrayList<>();
        Map<String, List<List<Object>>> evidence = (Map<String, List<List<Object>>>) snapshot.get("cellEvidence");
        for (List<Object> row : evidence.get(selectedDate)) {
            String[] parts = ((String) row.get(0)).split("\\|");
            if (!route.equals(parts[0])) continue;
            var cell = new LinkedHashMap<String, Object>();
            cell.put("airline", parts[1]); cell.put("timeBand", parts[2]);
            cell.put("medianFare", row.get(1)); cell.put("freshQuotes", row.get(2));
            cell.put("carriedDays", row.get(3)); cell.put("minimumFare", row.get(4));
            cell.put("maximumFare", row.get(5));
            cells.add(cell);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (String key : List.of("dataMode", "datasetId", "modelVersion", "configHash", "baseDate", "asOf", "methodology", "sourceAudit"))
            result.put(key, national.get(key));
        result.put("route", route);
        result.put("summary", selected);
        result.put("nationalIndex", national.get("index"));
        result.put("history", history);
        result.put("cells", cells);
        result.put("quality", allQuality.get(selectedDate).get(route));
        result.put("leadTime", ((Map<String, Object>) national.get("leadTime")).getOrDefault(route, List.of()));
        result.put("airlineTime", ((Map<String, Object>) national.get("airlineTime")).getOrDefault(route, List.of()));
        result.put("seasonality", ((Map<String, Object>) national.get("seasonality")).getOrDefault(route, List.of()));
        result.put("events", ((List<Map<String, Object>>) national.get("events")).stream()
                .filter(item -> route.equals(item.get("route"))).toList());
        return result;
    }

    @GetMapping("/comparison")
    @SuppressWarnings("unchecked")
    public Map<String, Object> comparison(@RequestParam LocalDate asOf,
                                          @RequestParam LocalDate compareTo) {
        if (compareTo.isAfter(asOf)) throw new ApiException(400, "Comparison date must be on or before the selected date");
        Map<String, Object> current = report(asOf);
        Map<String, Object> earlier = report(compareTo);
        Map<String, Map<String, Object>> earlierRoutes = new LinkedHashMap<>();
        for (Map<String, Object> item : (List<Map<String, Object>>) earlier.get("routes"))
            earlierRoutes.put((String) item.get("route"), item);
        List<Map<String, Object>> drivers = new ArrayList<>();
        for (Map<String, Object> item : (List<Map<String, Object>>) current.get("routes")) {
            String route = (String) item.get("route");
            Map<String, Object> before = earlierRoutes.get(route);
            double delta = ((Number) item.get("index")).doubleValue() - ((Number) before.get("index")).doubleValue();
            double weight = ((Number) item.get("weightPercent")).doubleValue();
            drivers.add(Map.of("route", route, "currentIndex", item.get("index"),
                    "comparisonIndex", before.get("index"), "deltaPoints", round(delta),
                    "contributionPoints", round(delta * weight / 100), "weightPercent", weight));
        }
        drivers.sort(Comparator.comparingDouble(row -> -Math.abs(((Number) row.get("contributionPoints")).doubleValue())));
        double oldIndex = ((Number) earlier.get("index")).doubleValue();
        double newIndex = ((Number) current.get("index")).doubleValue();
        return Map.of("asOf", asOf, "compareTo", compareTo,
                "index", newIndex, "comparisonIndex", oldIndex,
                "deltaPoints", round(newIndex - oldIndex),
                "changePercent", round((newIndex / oldIndex - 1) * 100),
                "drivers", drivers, "dataMode", "SIMULATED", "datasetId", snapshot.get("datasetId"));
    }

    @GetMapping(value = "/routes/{route}/evidence.csv", produces = "text/csv")
    @SuppressWarnings("unchecked")
    public ResponseEntity<String> evidenceCsv(@PathVariable String route,
                                               @RequestParam(required = false) LocalDate asOf) {
        Map<String, Object> result = routeInvestigation(route, asOf);
        StringBuilder csv = new StringBuilder("as_of,route,airline,departure_band,median_fare_inr,fresh_quotes,carried_days,minimum_fare_inr,maximum_fare_inr,data_mode,source,dataset_id,booking_horizon_days\n");
        for (Map<String, Object> cell : (List<Map<String, Object>>) result.get("cells")) {
            csv.append(result.get("asOf")).append(',').append(route).append(',').append(cell.get("airline"))
                    .append(',').append(cell.get("timeBand")).append(',').append(cell.get("medianFare"))
                    .append(',').append(cell.get("freshQuotes")).append(',').append(cell.get("carriedDays"))
                    .append(',').append(cell.get("minimumFare") == null ? "" : cell.get("minimumFare"))
                    .append(',').append(cell.get("maximumFare") == null ? "" : cell.get("maximumFare"))
                    .append(",SIMULATED,SkyMetrics synthetic generator,").append(result.get("datasetId"))
                    .append(",21\n");
        }
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=skymetrics-route-evidence.csv")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).body(csv.toString());
    }

    @GetMapping(value = "/index.csv", produces = "text/csv")
    public ResponseEntity<String> indexCsv(@RequestParam(required = false) LocalDate asOf) {
        Map<String, Object> result = report(asOf);
        StringBuilder csv = new StringBuilder("date,index,available_21_day_quotes,carried_cells,eligible_for_research,simulated_source,data_mode,base_date,dataset_id,fare_product,weighting,missing_data_policy\n");
        for (Map<String, Object> row : (List<Map<String, Object>>) result.get("series")) {
            boolean eligible = eligibleForResearch(row, qualityOn((String) row.get("date")));
            csv.append(row.get("date")).append(',').append(row.get("index")).append(',')
                    .append(row.get("available21DayQuotes")).append(',').append(row.get("carriedCells"))
                    .append(',').append(eligible).append(",SkyMetrics synthetic generator,SIMULATED,")
                    .append(result.get("baseDate")).append(',').append(result.get("datasetId"))
                    .append(",one_adult_one_way_nonstop_economy_INR,assumed_service_count,carry_forward_max_3_days\n");
        }
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=skymetrics-research-index.csv")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).body(csv.toString());
    }

    @GetMapping(value = "/routes.csv", produces = "text/csv")
    @SuppressWarnings("unchecked")
    public ResponseEntity<String> routesCsv(@RequestParam(required = false) LocalDate asOf) {
        Map<String, Object> result = report(asOf);
        Map<String, Object> routeQuality = (Map<String, Object>) result.get("routeQuality");
        StringBuilder csv = new StringBuilder("as_of,route,index,daily_change_percent,weekly_change_percent,monthly_change_percent,since_base_percent,contribution_points,assumed_service_weight_percent,matched_cells,attempted,available,unavailable,collection_failures,data_mode,simulated_source,base_date,dataset_id,fare_product,weighting,missing_data_policy\n");
        for (Map<String, Object> row : (List<Map<String, Object>>) result.get("routes")) {
            Map<String, Object> coverage = (Map<String, Object>) routeQuality.get(row.get("route"));
            for (Object value : List.of(result.get("asOf"), row.get("route"), row.get("index"))) csv.append(value).append(',');
            for (String key : List.of("dailyChangePercent", "weeklyChangePercent", "monthlyChangePercent", "changePercent", "contributionPoints", "weightPercent", "matchedCells")) {
                csv.append(row.get(key) == null ? "" : row.get(key)).append(',');
            }
            for (String key : List.of("attempted", "available", "unavailable", "collectionFailures")) csv.append(coverage.get(key)).append(',');
            csv.append("SIMULATED,SkyMetrics synthetic generator,").append(result.get("baseDate")).append(',')
                    .append(result.get("datasetId")).append(",one_adult_one_way_nonstop_economy_INR,assumed_service_count,carry_forward_max_3_days\n");
        }
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=skymetrics-research-routes.csv")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).body(csv.toString());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> qualityOn(String day) {
        int position = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.parse((String) snapshot.get("firstCollectionDate")), LocalDate.parse(day));
        return (Map<String, Object>) ((List<?>) snapshot.get("quality")).get(position);
    }

    private boolean eligibleForResearch(Map<String, Object> day, Map<String, Object> quality) {
        int attempted = ((Number) quality.get("attempted")).intValue();
        int available = ((Number) quality.get("available")).intValue();
        int carried = ((Number) day.get("carriedCells")).intValue();
        int cells = ((Number) snapshot.get("fixedMatchedCells")).intValue();
        return attempted > 0 && available * 100 >= attempted * 90 && carried * 100 <= cells * 5
                && ((Map<?, ?>) day.get("routes")).size() == ((Number) snapshot.get("basketRoutes")).intValue();
    }

    private Map<String, Object> eligibility(Map<String, Object> day, Map<String, Object> quality) {
        return Map.of("researchEligible", eligibleForResearch(day, quality), "officialPublicationEligible", false,
                "requiredRoutes", snapshot.get("basketRoutes"), "minimumAvailablePercent", 90,
                "maximumCarriedCellPercent", 5,
                "explanation", "Research threshold only. Simulated prices cannot establish a public or official airfare index.");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> routes(Map<String, Object> now, Map<String, Object> previous,
                                              Map<String, Object> week, Map<String, Object> month) {
        var values = (Map<String, Number>) now.get("routes");
        var counts = (Map<String, Number>) snapshot.get("serviceCounts");
        var matched = (Map<String, Number>) snapshot.get("matchedCellsByRoute");
        int totalWeight = counts.values().stream().mapToInt(Number::intValue).sum();
        List<Map<String, Object>> items = new ArrayList<>();
        for (var entry : values.entrySet()) {
            double index = entry.getValue().doubleValue();
            String route = entry.getKey();
            double weight = 100.0 * counts.get(route).intValue() / totalWeight;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("route", route); item.put("index", index);
            item.put("changePercent", round(index - 100));
            item.put("dailyChangePercent", routeMovement(index, previous, route));
            item.put("weeklyChangePercent", routeMovement(index, week, route));
            item.put("monthlyChangePercent", routeMovement(index, month, route));
            item.put("weightPercent", round(weight));
            item.put("contributionPoints", round((index - 100) * weight / 100));
            item.put("matchedCells", matched.get(route));
            items.add(item);
        }
        items.sort(Comparator.comparingDouble(row -> -((Number) row.get("changePercent")).doubleValue()));
        return items;
    }

    private List<Map<String, Object>> cities(List<Map<String, Object>> routes) {
        Map<String, List<Map<String, Object>>> grouped = new LinkedHashMap<>();
        for (var row : routes) grouped.computeIfAbsent(((String) row.get("route")).substring(0, 3), ignored -> new ArrayList<>()).add(row);
        List<Map<String, Object>> cities = new ArrayList<>();
        grouped.forEach((city, items) -> {
            double weight = items.stream().mapToDouble(item -> ((Number) item.get("weightPercent")).doubleValue()).sum();
            double index = items.stream().mapToDouble(item -> ((Number) item.get("index")).doubleValue() * ((Number) item.get("weightPercent")).doubleValue()).sum() / weight;
            double contribution = items.stream().mapToDouble(item -> ((Number) item.get("contributionPoints")).doubleValue()).sum();
            cities.add(Map.of("city", city, "index", round(index), "changePercent", round(index - 100),
                    "contributionPoints", round(contribution), "weightPercent", round(weight), "coveredRoutes", items.size()));
        });
        cities.sort(Comparator.comparingDouble(row -> -((Number) row.get("changePercent")).doubleValue()));
        return cities;
    }

    private List<Map<String, Object>> directionalPairs(List<Map<String, Object>> routes) {
        Map<String, Map<String, Object>> byRoute = new LinkedHashMap<>();
        routes.forEach(row -> byRoute.put((String) row.get("route"), row));
        List<Map<String, Object>> pairs = new ArrayList<>();
        for (var row : routes) {
            String route = (String) row.get("route");
            String[] codes = route.split("-");
            String reverse = codes[1] + "-" + codes[0];
            if (route.compareTo(reverse) >= 0 || !byRoute.containsKey(reverse)) continue;
            var opposite = byRoute.get(reverse);
            pairs.add(Map.of("outbound", route, "return", reverse,
                    "outboundIndex", row.get("index"), "returnIndex", opposite.get("index"),
                    "gapPoints", round(((Number) row.get("index")).doubleValue() - ((Number) opposite.get("index")).doubleValue())));
        }
        pairs.sort(Comparator.comparingDouble(row -> -Math.abs(((Number) row.get("gapPoints")).doubleValue())));
        return pairs;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> qualityFor(int position) {
        Map<String, Object> row = (Map<String, Object>) ((List<?>) snapshot.get("quality")).get(position);
        Map<String, Object> result = new LinkedHashMap<>(row);
        result.put("fixedMatchedCells", snapshot.get("fixedMatchedCells"));
        result.put("coveredRoutes", snapshot.get("basketRoutes"));
        result.put("available21DayQuotes", series.get(position).get("available21DayQuotes"));
        result.put("availabilityPercent", round(100 * ((Number) row.get("available")).doubleValue() / ((Number) row.get("attempted")).doubleValue()));
        return result;
    }

    @SuppressWarnings("unchecked")
    private static Double routeMovement(double current, Map<String, Object> previous, String route) {
        if (previous == null) return null;
        Number old = ((Map<String, Number>) previous.get("routes")).get(route);
        return old == null ? null : round(100 * (current / old.doubleValue() - 1));
    }

    private static Double movement(Map<String, Object> current, Map<String, Object> previous) {
        return previous == null ? null : round(100 * (((Number) current.get("index")).doubleValue() / ((Number) previous.get("index")).doubleValue() - 1));
    }

    private static double round(double value) { return Math.round(value * 100.0) / 100.0; }
}
