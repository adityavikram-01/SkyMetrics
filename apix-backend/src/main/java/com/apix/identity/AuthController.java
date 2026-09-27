package com.apix.identity;

import com.apix.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final SecurityContextRepository contexts;
    private final AccountMailService mail;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder passwords, SecurityContextRepository contexts, AccountMailService mail) {
        this.jdbc = jdbc;
        this.passwords = passwords;
        this.contexts = contexts;
        this.mail = mail;
    }

    public record RegisterRequest(@NotBlank @Size(max=80) String name,
                                  @NotBlank @Email @Size(max=190) String email,
                                  @NotBlank @Size(min=12,max=128) String password) {}
    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record UserView(String id, String name, String email, String role, String homeAirport, String preferredAirline) {}

    @GetMapping("/csrf")
    public Map<String,String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/register")
    @Transactional
    public UserView register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request, HttpServletResponse response) {
        String email = normalize(body.email());
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO app_user(id,email,display_name,password_hash,role) VALUES(?,?,?,?,?)",
                id, email, body.name().trim(), passwords.encode(body.password()), "TRAVELLER");
        signIn(email, "TRAVELLER", request, response);
        return user(email);
    }

    @PostMapping("/login")
    public UserView login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        return loginForRoles(body, Set.of("TRAVELLER"), request, response);
    }

    @PostMapping("/{workspace}/login")
    public UserView workspaceLogin(@PathVariable String workspace, @Valid @RequestBody LoginRequest body,
                                   HttpServletRequest request, HttpServletResponse response) {
        Set<String> roles = switch (workspace) {
            case "government" -> Set.of("GOV_ANALYST", "ADMIN");
            case "developer" -> Set.of("PARTNER", "ADMIN");
            case "admin" -> Set.of("ADMIN");
            default -> throw new ApiException(404, "Workspace not found");
        };
        return loginForRoles(body, roles, request, response);
    }

    private UserView loginForRoles(LoginRequest body, Set<String> roles, HttpServletRequest request, HttpServletResponse response) {
        String email = normalize(body.email());
        var matches = jdbc.query("SELECT password_hash,role FROM app_user WHERE email=?", (rs,n) -> new String[]{rs.getString(1), rs.getString(2)}, email);
        if (matches.isEmpty() || !passwords.matches(body.password(), matches.getFirst()[0]) || !roles.contains(matches.getFirst()[1]))
            throw new ApiException(401, "Invalid email or password");
        signIn(email, matches.getFirst()[1], request, response);
        mail.loginNotice(email);
        return user(email);
    }

    @GetMapping("/me")
    public UserView me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated())
            throw new ApiException(401, "Sign in required");
        return user(authentication.getName());
    }

    @PostMapping("/logout")
    public Map<String,Boolean> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("signedOut", true);
    }

    private void signIn(String email, String role, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) request.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(email, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
    }

    private UserView user(String email) {
        return jdbc.query("SELECT id,display_name,email,role,home_airport,preferred_airline FROM app_user WHERE email=?",
                (rs,n) -> new UserView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6)), email)
                .stream().findFirst().orElseThrow(() -> new ApiException(401, "Sign in required"));
    }

    static String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
}
