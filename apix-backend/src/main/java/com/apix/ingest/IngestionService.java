package com.apix.ingest;

import com.apix.domain.*;
import com.apix.web.ApiException;

import static com.apix.web.ApiException.require;

import com.fasterxml.jackson.databind.*;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Service
public class IngestionService {
    @PersistenceContext
    private EntityManager em;
    private final ObjectMapper mapper;

    public IngestionService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public static String hash(String body) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private JsonNode json(String text) {
        try {
            return mapper.readTree(text);
        } catch (Exception e) {
            throw new ApiException(400, "Invalid config JSON");
        }
    }

    private static void uuid(String x) {
        try {
            require(UUID.fromString(x).toString().equals(x), "Invalid UUID");
        } catch (Exception e) {
            throw new ApiException(400, "Invalid UUID");
        }
    }

    private <T> T one(Class<T> type, String field, String value) {
        return em.createQuery("from " + type.getSimpleName() + " where " + field + "=:v", type).setParameter("v", value).getResultStream().findFirst().orElse(null);
    }

    private <T> Map<String, T> all(Class<T> type, Function<T, String> key) {
        return em.createQuery("from " + type.getSimpleName(), type).getResultStream().collect(Collectors.toMap(key, Function.identity()));
    }

    @Transactional
    public Map<String, Object> dataset(Contracts.DatasetRequest req) {
        require(req.synthetic(), "Only SIMULATED datasets accepted");
        uuid(req.externalId());
        require(hash(req.canonicalConfig()).equals(req.configHash()), "Config hash mismatch");
        var cfg = json(req.canonicalConfig());
        require(cfg.path("is_synthetic").asBoolean() && cfg.path("model_version").asText().equals(req.modelVersion()), "Config provenance mismatch");
        require(cfg.path("services").isArray() && cfg.path("services").size() > 0 && cfg.path("horizons").size() > 0, "Schedule and horizons required");
        require(cfg.path("capacity").asInt() > 0 && cfg.path("capacity").asInt() <= 500, "Invalid capacity");
        var existing = one(Dataset.class, "externalId", req.externalId());
        if (existing != null) {
            if (!existing.configHash.equals(req.configHash()))
                throw new ApiException(409, "Dataset config is immutable");
            return Map.of("datasetId", existing.externalId, "status", "DUPLICATE");
        }
        var sources = all(DataSource.class, s -> s.code);
        var source = sources.get("APIX_SIMULATOR");
        if (source == null) {
            source = new DataSource();
            source.code = "APIX_SIMULATOR";
            em.persist(source);
        }
        var d = new Dataset();
        d.externalId = req.externalId();
        d.source = source;
        d.modelVersion = req.modelVersion();
        d.configHash = req.configHash();
        d.canonicalConfig = req.canonicalConfig();
        em.persist(d);
        var airports = all(Airport.class, a -> a.code);
        var airlines = all(Airline.class, a -> a.code);
        var routes = all(Route.class, r -> r.code);
        cfg.path("routes").fieldNames().forEachRemaining(code -> {
            require(code.matches("[A-Z]{3}-[A-Z]{3}") && !code.substring(0, 3).equals(code.substring(4)), "Invalid route");
            for (var a : code.split("-"))
                if (!airports.containsKey(a)) {
                    var x = new Airport();
                    x.code = a;
                    em.persist(x);
                    airports.put(a, x);
                }
            if (!routes.containsKey(code)) {
                var r = new Route();
                r.code = code;
                r.origin = airports.get(code.substring(0, 3));
                r.destination = airports.get(code.substring(4));
                em.persist(r);
                routes.put(code, r);
            }
        });
        cfg.path("airlines").fieldNames().forEachRemaining(code -> {
            require(code.matches("[A-Z0-9]{2}"), "Invalid airline");
            if (!airlines.containsKey(code)) {
                var a = new Airline();
                a.code = code;
                em.persist(a);
                airlines.put(code, a);
            }
        });
        for (var e : cfg.path("events"))
            for (var rc : e.path("routes")) {
                require(routes.containsKey(rc.asText()), "Unknown event route");
                var event = new CalendarEvent();
                event.dataset = d;
                event.route = routes.get(rc.asText());
                event.name = e.path("name").asText();
                event.eventDate = LocalDate.parse(e.path("date").asText());
                event.windowStart = event.eventDate.minusDays(e.path("pre_days").asInt());
                event.windowEnd = event.eventDate.plusDays(e.path("post_days").asInt());
                event.dateSource = e.path("date_source").asText("ENGINEERING_ASSUMPTION");
                em.persist(event);
            }
        if (one(FareProduct.class, "code", "ADULT_ONEWAY_ECONOMY_NONSTOP") == null) {
            var p = new FareProduct();
            p.code = "ADULT_ONEWAY_ECONOMY_NONSTOP";
            em.persist(p);
        }
        return Map.of("datasetId", d.externalId, "status", "CREATED", "dataMode", "SIMULATED");
    }

    @Transactional
    public Map<String, Object> ingest(Contracts.RunRequest req, String key, String payloadHash) {
        require(req.synthetic(), "Only SIMULATED runs accepted");
        uuid(req.datasetId());
        uuid(req.runId());
        require(key != null && key.matches("[A-Za-z0-9._:-]{1,100}"), "Valid Idempotency-Key required");
        var d = one(Dataset.class, "externalId", req.datasetId());
        if (d == null) throw new ApiException(404, "Register dataset first");
        var previous = em.createQuery("from CollectionRun where dataset=:d and idempotencyKey=:k", CollectionRun.class).setParameter("d", d).setParameter("k", key).getResultStream().findFirst();
        if (previous.isPresent()) {
            var p = previous.get();
            if (!p.payloadHash.equals(payloadHash))
                throw new ApiException(409, "Idempotency key already used with different bytes");
            return Map.of("status", "DUPLICATE", "runId", p.externalId, "resultCount", p.resultCount);
        }
        var cfg = json(d.canonicalConfig);
        var allowed = new HashSet<String>();
        for (var s : cfg.path("services"))
            for (var h : cfg.path("horizons"))
                allowed.add(s.path("route").asText() + "|" + s.path("airline").asText() + "|" + s.path("flight_number").asText() + "|" + LocalTime.parse(s.path("local_time").asText()) + "|" + h.asInt());
        require(allowed.size() == req.results().size(), "Run must account for every configured service and horizon");
        var ist = ZoneId.of("Asia/Kolkata");
        require(req.observedAt().equals(req.collectionDate().atTime(9, 0).atZone(ist).toInstant()), "Observation must be 09:00 Asia/Kolkata");
        var seen = new HashSet<String>();
        var ids = new HashSet<String>();
        for (var r : req.results()) {
            uuid(r.resultId());
            uuid(r.flightId());
            uuid(r.serviceId());
            require(ids.add(r.resultId()), "Duplicate result id");
            var k = r.route() + "|" + r.airline() + "|" + r.flightNumber() + "|" + r.departureAt().atZone(ist).toLocalTime() + "|" + r.horizon();
            require(allowed.contains(k) && seen.add(k), "Unexpected or duplicate schedule/horizon");
            require(req.collectionDate().plusDays(r.horizon()).equals(r.departureDate()) && r.departureAt().atZone(ist).toLocalDate().equals(r.departureDate()), "Horizon or local departure date mismatch");
            require(r.departureAt().isAfter(req.observedAt()) && r.arrivalAt().isAfter(r.departureAt()), "Invalid flight times");
            require((r.outcome() == Outcome.AVAILABLE) == (r.totalPaise() != null), "Outcome/amount mismatch");
            if (r.totalPaise() != null)
                require(r.totalPaise() >= cfg.path("price_bounds").get(0).decimalValue().movePointRight(2).longValueExact() && r.totalPaise() <= cfg.path("price_bounds").get(1).decimalValue().movePointRight(2).longValueExact(), "Fare outside configured bounds");
            require(r.latentRemaining() <= cfg.path("capacity").asInt(), "Inventory exceeds capacity");
        }
        var routes = all(Route.class, r -> r.code);
        var airlines = all(Airline.class, a -> a.code);
        var services = em.createQuery("select s from FlightService s join fetch s.route join fetch s.airline", FlightService.class).getResultStream().collect(Collectors.toMap(s -> s.externalId, Function.identity()));
        var flightIds = req.results().stream().map(Contracts.Row::flightId).distinct().toList();
        var departures = em.createQuery("select f from FlightDeparture f join fetch f.service where f.externalId in :ids", FlightDeparture.class).setParameter("ids", flightIds).getResultStream().collect(Collectors.toMap(f -> f.externalId, Function.identity()));
        var product = one(FareProduct.class, "code", "ADULT_ONEWAY_ECONOMY_NONSTOP");
        var run = new CollectionRun();
        run.externalId = req.runId();
        run.dataset = d;
        run.collectionDate = req.collectionDate();
        run.observedAt = req.observedAt();
        run.idempotencyKey = key;
        run.payloadHash = payloadHash;
        run.resultCount = req.results().size();
        em.persist(run);
        for (var r : req.results()) {
            var s = services.get(r.serviceId());
            if (s == null) {
                s = new FlightService();
                s.externalId = r.serviceId();
                s.route = routes.get(r.route());
                s.airline = airlines.get(r.airline());
                s.flightNumber = r.flightNumber();
                s.localTime = r.departureAt().atZone(ist).toLocalTime();
                em.persist(s);
                services.put(s.externalId, s);
            } else
                require(s.route.code.equals(r.route()) && s.airline.code.equals(r.airline()) && s.flightNumber.equals(r.flightNumber()) && s.localTime.equals(r.departureAt().atZone(ist).toLocalTime()), "Service identity conflict");
            var f = departures.get(r.flightId());
            if (f == null) {
                f = new FlightDeparture();
                f.externalId = r.flightId();
                f.service = s;
                f.departureDate = r.departureDate();
                f.departureAt = r.departureAt();
                f.arrivalAt = r.arrivalAt();
                int hour = r.departureAt().atZone(ist).getHour();
                f.timeBand = hour < 9 ? "early_morning" : hour < 17 ? "daytime" : hour < 21 ? "evening" : "night";
                em.persist(f);
                departures.put(f.externalId, f);
            } else
                require(f.service.id.equals(s.id) && f.departureAt.equals(r.departureAt()) && f.arrivalAt.equals(r.arrivalAt()), "Departure identity conflict");
            var cr = new CollectionResult();
            cr.externalId = r.resultId();
            cr.run = run;
            cr.departure = f;
            cr.product = product;
            cr.horizon = r.horizon();
            cr.outcome = r.outcome();
            em.persist(cr);
            if (r.outcome().success()) {
                var fare = new FareObservation();
                fare.result = cr;
                fare.totalAmount = r.totalPaise() == null ? null : BigDecimal.valueOf(r.totalPaise(), 2);
                em.persist(fare);
            }
            var state = new SimulationInventoryState();
            state.result = cr;
            state.remaining = r.latentRemaining();
            state.arrivals = r.latentArrivals();
            state.cancellations = r.latentCancellations();
            em.persist(state);
        }
        em.flush();
        return Map.of("status", "IMPORTED", "runId", run.externalId, "resultCount", run.resultCount, "dataMode", "SIMULATED");
    }
}
