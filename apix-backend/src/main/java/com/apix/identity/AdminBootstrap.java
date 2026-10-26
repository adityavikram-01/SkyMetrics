package com.apix.identity;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final Environment environment;

    public AdminBootstrap(JdbcTemplate jdbc, PasswordEncoder passwords, Environment environment) {
        this.jdbc = jdbc;
        this.passwords = passwords;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = environment.getProperty("SKYMETRICS_BOOTSTRAP_ADMIN_EMAIL", "").trim().toLowerCase();
        String password = environment.getProperty("SKYMETRICS_BOOTSTRAP_ADMIN_PASSWORD", "");
        if (email.isBlank() && password.isBlank()) return;
        if (email.isBlank() || password.length() < 16)
            throw new IllegalStateException("Bootstrap admin requires an email and a password of at least 16 characters");
        String passwordHash = passwords.encode(password);
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM app_user WHERE email=?", Integer.class, email);
        if (exists != null && exists > 0) {
            jdbc.update("UPDATE app_user SET password_hash=?, role='ADMIN' WHERE email=?", passwordHash, email);
        } else {
            jdbc.update("INSERT INTO app_user(id,email,display_name,password_hash,role) VALUES(?,?,?,?,?)",
                    UUID.randomUUID().toString(), email, "SkyMetrics Admin", passwordHash, "ADMIN");
        }
        // The configured bootstrap account is the single platform owner. Preserve other
        // accounts and their data, but remove administrator privileges from every other one.
        jdbc.update("UPDATE app_user SET role='TRAVELLER' WHERE role='ADMIN' AND email<>?", email);
    }
}
