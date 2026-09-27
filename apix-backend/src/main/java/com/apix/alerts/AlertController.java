package com.apix.alerts;

import com.apix.domain.*;
import com.apix.analytics.ObservationStore;
import com.apix.web.ApiException;

import static com.apix.web.ApiException.require;

import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {
    @PersistenceContext
    private EntityManager em;
    private final ObservationStore store;

    public AlertController(ObservationStore store) {
        this.store = store;
    }

    public record AlertRequest
            (@NotBlank String datasetId, @NotBlank String route, @NotNull LocalDate departureDate,
             @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal threshold) {
    }

    @PostMapping
    @Transactional
    public Object create(@Valid @RequestBody AlertRequest req) {
        var id = store.dataset(req.datasetId());
        var d = em.find(Dataset.class, id);
        var route = em.createQuery("from Route where code=:r", Route.class).setParameter("r", req.route()).getResultStream().findFirst().orElseThrow(() -> new ApiException(404, "Unknown route"));
        var alert = new PriceAlert();
        alert.dataset = d;
        alert.route = route;
        alert.departureDate = req.departureDate();
        alert.threshold = req.threshold();
        em.persist(alert);
        return Map.of("alertId", alert.id, "active", true);
    }

    @GetMapping
    public Object list(@RequestParam String datasetId) {
        return store.jdbc().queryForList("SELECT a.id,r.code AS route,a.departure_date,a.threshold,a.active FROM price_alert a JOIN route r ON r.id=a.route_id WHERE a.dataset_id=?", store.dataset(datasetId));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public Object delete(@PathVariable String id) {
        var a = em.find(PriceAlert.class, id);
        if (a == null) throw new ApiException(404, "Alert not found");
        a.active = false;
        return Map.of("active", false);
    }

    @PostMapping("/evaluate")
    @Transactional
    public Object evaluate(@RequestParam String datasetId, @RequestParam(required = false) LocalDate asOf) {
        String id = store.dataset(datasetId);
        var day = store.anchor(id, asOf);
        var alerts = em.createQuery("select a from PriceAlert a join fetch a.route where a.dataset.id=:id and a.active=true", PriceAlert.class).setParameter("id", id).getResultList();
        int created = 0;
        for (var a : alerts) {
            var match = store.rows(id, a.route.code, null, day, day, a.departureDate, a.departureDate).stream().filter(r -> r.amount() != null && BigDecimal.valueOf(r.amount()).compareTo(a.threshold) < 0).min(Comparator.comparing(com.apix.analytics.ObservationStore.Observation::amount));
            if (match.isEmpty()) continue;
            var r = match.get();
            var result = em.find(CollectionResult.class, r.resultId());
            var count = em.createQuery("select count(n) from AlertNotification n where n.alert=:a and n.result=:r", Long.class).setParameter("a", a).setParameter("r", result).getSingleResult();
            if (count == 0) {
                var n = new AlertNotification();
                n.alert = a;
                n.result = result;
                n.amount = BigDecimal.valueOf(r.amount());
                n.observedAt = r.observedAt();
                em.persist(n);
                created++;
            }
        }
        return Map.of("createdNotifications", created, "delivery", "IN_APP_ONLY", "asOf", day);
    }

    @GetMapping("/notifications")
    public Object notifications(@RequestParam String datasetId) {
        return store.jdbc().queryForList("SELECT n.id,n.alert_id,n.amount,n.observed_at FROM alert_notification n JOIN price_alert a ON a.id=n.alert_id WHERE a.dataset_id=? ORDER BY n.observed_at DESC", store.dataset(datasetId));
    }
}
