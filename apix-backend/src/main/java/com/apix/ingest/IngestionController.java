package com.apix.ingest;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.*;
import org.springframework.web.bind.annotation.*;
import com.apix.web.ApiException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ingestion")
public class IngestionController {
    private final IngestionService service;
    private final ObjectMapper mapper;
    private final Validator validator;

    public IngestionController(IngestionService s, ObjectMapper m, Validator v) {
        service = s;
        mapper = m;
        validator = v;
    }

    @PostMapping("/datasets")
    public Map<String, Object> dataset(@Valid @RequestBody Contracts.DatasetRequest req) {
        return service.dataset(req);
    }

    @PostMapping("/runs")
    public Map<String, Object> run(@RequestHeader("Idempotency-Key") String key, @RequestBody String raw) {
        Contracts.RunRequest req;
        try {
            req = mapper.readValue(raw, Contracts.RunRequest.class);
        } catch (Exception e) {
            throw new ApiException(400, "Invalid collection run JSON");
        }
        var errors = validator.validate(req);
        if (!errors.isEmpty())
            throw new ApiException(400, errors.iterator().next().getPropertyPath() + ": " + errors.iterator().next().getMessage());
        return service.ingest(req, key, IngestionService.hash(raw));
    }
}
