package com.apix.web;

import com.apix.analytics.AirfarePolicyIndexService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/indices/airfare")
public class GovernmentIndexController {
    private final AirfarePolicyIndexService index;

    public GovernmentIndexController(AirfarePolicyIndexService index) {
        this.index = index;
    }

    @GetMapping("/government")
    public Map<String, Object> government(@RequestParam String datasetId,
                                           @RequestParam(required = false) LocalDate asOf) {
        return index.report(datasetId, asOf);
    }
}
