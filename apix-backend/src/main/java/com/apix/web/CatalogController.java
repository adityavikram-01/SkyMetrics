package com.apix.web;

import com.apix.analytics.ObservationStore;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {
    private final ObservationStore store;

    public CatalogController(ObservationStore store) {
        this.store = store;
    }

    @GetMapping("/health")
    public Object health() {
        store.jdbc().queryForObject("SELECT 1", Integer.class);
        return Map.of("status", "UP", "dataMode", "SIMULATED", "security", "SESSION_AUTH_WITH_ROLES");
    }

    @GetMapping("/datasets")
    public Object datasets() {
        return store.jdbc().queryForList("SELECT external_id AS datasetId,model_version AS modelVersion,config_hash AS configHash FROM dataset");
    }

    @GetMapping("/catalog/{kind}")
    public Object catalog(@PathVariable String kind) {
        String table = switch (kind) {
            case "routes" -> "route";
            case "airports" -> "airport";
            case "airlines" -> "airline";
            case "products" -> "fare_product";
            default -> throw new ApiException(404, "Unknown catalog");
        };
        return store.jdbc().queryForList("SELECT id,code FROM " + table + " ORDER BY code");
    }

    @GetMapping("/admin/collection-runs")
    public Object runs(@RequestParam String datasetId) {
        String id = store.dataset(datasetId);
        return store.jdbc().queryForList("SELECT r.external_id AS runId,r.collection_date AS collectionDate,r.result_count AS results, SUM(cr.outcome IN ('AVAILABLE','SOLD_OUT','NO_OFFER')) AS successfulCollections FROM collection_run r JOIN collection_result cr ON cr.run_id=r.id WHERE r.dataset_id=? GROUP BY r.id ORDER BY r.collection_date", id);
    }
}
