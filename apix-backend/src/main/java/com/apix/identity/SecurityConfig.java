package com.apix.identity;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository contexts, JdbcTemplate jdbc) throws Exception {
        http
            .csrf(csrf -> csrf.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
            .securityContext(context -> context.securityContextRepository(contexts))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/", "/index.html", "/favicon.svg", "/assets/**",
                    "/users", "/users/**", "/flights", "/insights", "/market", "/login",
                    "/help", "/account", "/profile", "/government", "/government/login",
                    "/policy", "/developer", "/developer/login", "/developers", "/admin",
                    "/admin/login").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/me/**").authenticated()
                .requestMatchers("/api/v1/indices/airfare/government", "/api/v1/policy/**").hasAnyRole("GOV_ANALYST", "ADMIN")
                .requestMatchers("/api/v1/partner/**").hasAnyRole("PARTNER", "ADMIN")
                .requestMatchers("/api/v1/ops/**", "/api/v1/admin/**", "/api/v1/ingestion/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/alerts/**").denyAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/catalog/**", "/api/v1/datasets").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/fares/**", "/api/v1/departures/**", "/api/v1/intelligence/**", "/api/v1/routes/**", "/api/v1/airlines/**", "/api/v1/indices/airfare", "/api/v1/analytics/**", "/api/v1/prediction/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/fares/evaluate").authenticated()
                .anyRequest().denyAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> jsonError(response, 401, "Sign in required"))
                .accessDeniedHandler((request, response, error) -> jsonError(response, 403, "Access denied")))
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .addFilterBefore(new CurrentRoleFilter(jdbc), AuthorizationFilter.class);
        return http.build();
    }

    private static void jsonError(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
