package com.apix.web;

import com.apix.analytics.AnalyticsService;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class AnalyticsController {
    private final AnalyticsService service;

    public AnalyticsController(AnalyticsService service) {
        this.service = service;
    }

    @GetMapping("/fares/search")
    public Object search(@RequestParam String datasetId, @RequestParam(required = false) String route, @RequestParam(required = false) String airline, @RequestParam(required = false) LocalDate departureDate, @RequestParam(required = false) LocalDate asOf, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return service.search(datasetId, route, airline, departureDate, asOf, page, size);
    }

    @GetMapping("/departures/{flightId}/history")
    public Object history(@PathVariable String flightId, @RequestParam String datasetId, @RequestParam(required = false) LocalDate asOf) {
        return service.history(datasetId, flightId, asOf);
    }

    @GetMapping("/intelligence/{origin}/{destination}")
    public Object intelligence(@PathVariable String origin, @PathVariable String destination, @RequestParam String datasetId, @RequestParam LocalDate departureDate, @RequestParam(required = false) String airline, @RequestParam(required = false) LocalDate asOf) {
        return service.intelligence(datasetId, origin + "-" + destination, airline, departureDate, asOf, null);
    }

    public record Evaluation(@NotBlank String datasetId, @Pattern(regexp = "[A-Z]{3}-[A-Z]{3}") String route,
                             String airline, @NotNull LocalDate departureDate, LocalDate asOf,
                             @NotNull @Positive Double fare) {
    }

    @PostMapping("/fares/evaluate")
    public Object evaluate(@Valid @RequestBody Evaluation req) {
        return service.intelligence(req.datasetId(), req.route(), req.airline(), req.departureDate(), req.asOf(), req.fare());
    }

    @GetMapping("/fares/calendar")
    public Object calendar(@RequestParam String datasetId, @RequestParam String route, @RequestParam(required = false) LocalDate asOf) {
        return service.calendar(datasetId, route, asOf);
    }

    @GetMapping("/routes/{route}/statistics")
    public Object statistics(@PathVariable String route, @RequestParam String datasetId, @RequestParam(required = false) String airline, @RequestParam(required = false) LocalDate asOf, @RequestParam(defaultValue = "30") int days) {
        return service.statistics(datasetId, route, airline, asOf, days);
    }

    @GetMapping("/routes/{route}/booking-window")
    public Object booking(@PathVariable String route, @RequestParam String datasetId, @RequestParam(required = false) String airline, @RequestParam(required = false) LocalDate asOf) {
        return service.booking(datasetId, route, airline, asOf);
    }

    @GetMapping("/airlines/compare")
    public Object airlines(@RequestParam String route, @RequestParam String datasetId, @RequestParam(required = false) LocalDate asOf, @RequestParam(defaultValue = "30") int days) {
        return service.airlines(datasetId, route, asOf, days);
    }

    @GetMapping("/routes/{route}/volatility")
    public Object volatility(@PathVariable String route, @RequestParam String datasetId, @RequestParam(required = false) LocalDate asOf, @RequestParam(defaultValue = "30") int days) {
        return service.volatility(datasetId, route, asOf, days);
    }

    @GetMapping("/indices/airfare")
    public Object index(@RequestParam String datasetId, @RequestParam(required = false) LocalDate asOf, @RequestParam(required = false) String city) {
        return service.index(datasetId, asOf, city);
    }

    @GetMapping("/analytics/heatmap")
    public Object heatmap(@RequestParam String datasetId, @RequestParam(required = false) LocalDate asOf, @RequestParam(defaultValue = "30") int lagDays) {
        return service.heatmap(datasetId, asOf, lagDays);
    }

    @GetMapping("/analytics/anomalies")
    public Object anomalies(@RequestParam String datasetId, @RequestParam(required = false) String route, @RequestParam(required = false) LocalDate asOf) {
        return service.anomalies(datasetId, route, asOf);
    }

    @GetMapping("/analytics/events/{name}")
    public Object events(@PathVariable String name, @RequestParam String datasetId, @RequestParam(required = false) String route, @RequestParam(required = false) LocalDate asOf) {
        return service.events(datasetId, name, route, asOf);
    }

    @GetMapping("/prediction/{origin}/{destination}")
    public Object prediction(@PathVariable String origin, @PathVariable String destination, @RequestParam String datasetId, @RequestParam LocalDate departureDate, @RequestParam(required = false) String airline, @RequestParam(required = false) LocalDate asOf) {
        return service.prediction(datasetId, origin + "-" + destination, airline, departureDate, asOf);
    }
}
