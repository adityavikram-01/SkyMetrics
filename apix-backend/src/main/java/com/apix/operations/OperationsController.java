package com.apix.operations;

import com.apix.web.ApiException;
import com.apix.alerts.AlertController;
import com.apix.identity.AccountMailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/ops")
public class OperationsController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final AlertController alerts;
    private final AccountMailService mail;
    private final String ownerEmail;

    public OperationsController(JdbcTemplate jdbc, PasswordEncoder passwords, AlertController alerts, AccountMailService mail,
                                @Value("${SKYMETRICS_BOOTSTRAP_ADMIN_EMAIL:}") String ownerEmail) {
        this.jdbc=jdbc; this.passwords=passwords; this.alerts=alerts; this.mail=mail; this.ownerEmail=ownerEmail.trim().toLowerCase(Locale.ROOT);
    }

    @GetMapping("/overview")
    public Map<String,Object> overview(Authentication auth) {
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("dataMode","SIMULATED");
        result.put("accountEmailConfigured",mail.configured());
        result.put("owner",!ownerEmail.isBlank() && ownerEmail.equalsIgnoreCase(auth.getName()));
        result.put("ownerEmail",ownerEmail);
        result.put("routes",jdbc.queryForObject("SELECT COUNT(*) FROM route",Integer.class));
        result.put("airlines",jdbc.queryForObject("SELECT COUNT(*) FROM airline",Integer.class));
        result.put("datasets",jdbc.queryForObject("SELECT COUNT(*) FROM dataset",Integer.class));
        result.put("collectionRuns",jdbc.queryForObject("SELECT COUNT(*) FROM collection_run",Integer.class));
        result.put("lastCollectionDate",jdbc.queryForObject("SELECT MAX(collection_date) FROM collection_run",java.sql.Date.class));
        result.put("accounts",jdbc.queryForObject("SELECT COUNT(*) FROM app_user",Integer.class));
        result.put("fareObservationsEstimate",jdbc.queryForObject("SELECT COALESCE(TABLE_ROWS,0) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fare_observation'",Long.class));
        result.put("countNote","Fare observation count is an InnoDB estimate for dashboard speed.");
        return result;
    }

    @GetMapping("/datasets")
    public List<Map<String,Object>> datasets() {
        return jdbc.queryForList("SELECT external_id AS datasetId,model_version AS modelVersion,synthetic AS simulated FROM dataset ORDER BY model_version");
    }

    @GetMapping("/collection-runs")
    public List<Map<String,Object>> collectionRuns() {
        return jdbc.queryForList("SELECT external_id AS runId,collection_date AS collectionDate,result_count AS resultCount FROM collection_run ORDER BY collection_date DESC LIMIT 20");
    }

    @GetMapping("/users")
    public List<Map<String,Object>> users() {
        return jdbc.queryForList("SELECT id,email,display_name AS name,role,home_airport AS homeAirport,created_at AS createdAt FROM app_user ORDER BY created_at DESC LIMIT 100");
    }

    public record ProvisionRequest(@NotBlank @Email String email, @NotBlank String name,
                                   @NotBlank @Size(min=16,max=128) String temporaryPassword,
                                   @NotBlank String role) {}

    @PostMapping("/users")
    public Map<String,String> provision(@Valid @RequestBody ProvisionRequest body, Authentication auth) {
        // The route is already restricted to ADMIN in SecurityConfig. Only the owner can grant ADMIN.
        if(!Set.of("GOV_ANALYST","PARTNER").contains(body.role())) throw new ApiException(400,"Role must be GOV_ANALYST or PARTNER");
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO app_user(id,email,display_name,password_hash,role) VALUES(?,?,?,?,?)",
                id,body.email().trim().toLowerCase(Locale.ROOT),body.name().trim(),passwords.encode(body.temporaryPassword()),body.role());
        return Map.of("id",id,"role",body.role());
    }

    public record RoleRequest(@NotBlank String role) {}

    @PutMapping("/users/{id}/role")
    public Map<String,String> changeRole(@PathVariable String id, @Valid @RequestBody RoleRequest body, Authentication auth) {
        requireOwner(auth);
        if (!Set.of("TRAVELLER","GOV_ANALYST","PARTNER","ADMIN").contains(body.role()))
            throw new ApiException(400,"Invalid account role");
        int changed=jdbc.update("UPDATE app_user SET role=? WHERE id=? AND email<>?",body.role(),id,ownerEmail);
        if(changed==0) throw new ApiException(404,"Account not found or protected owner");
        return Map.of("id",id,"role",body.role());
    }

    @PostMapping("/alerts/evaluate")
    public Object evaluateAlerts(@RequestParam String datasetId, @RequestParam(required=false) java.time.LocalDate asOf) {
        return alerts.evaluate(datasetId, asOf);
    }

    private void requireOwner(Authentication auth) {
        if (ownerEmail.isBlank() || auth==null || !ownerEmail.equalsIgnoreCase(auth.getName()))
            throw new ApiException(403,"Only the platform owner can manage account access");
    }
}
