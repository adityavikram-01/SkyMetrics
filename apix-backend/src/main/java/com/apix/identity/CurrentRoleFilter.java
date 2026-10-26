package com.apix.identity;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/** Keeps permissions in sync when the owner changes an account role. */
public class CurrentRoleFilter extends OncePerRequestFilter {
    private final JdbcTemplate jdbc;

    public CurrentRoleFilter(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var current=SecurityContextHolder.getContext().getAuthentication();
        if (current!=null && !(current instanceof AnonymousAuthenticationToken) && current.isAuthenticated()
                && current.getName()!=null && request.getRequestURI().startsWith("/api/v1/")) {
            List<String> roles=jdbc.query("SELECT role FROM app_user WHERE email=?",(rs,n)->rs.getString(1),current.getName());
            if(roles.isEmpty()) SecurityContextHolder.clearContext();
            else {
                String authority="ROLE_"+roles.getFirst();
                if(current.getAuthorities().stream().noneMatch(item->authority.equals(item.getAuthority())))
                    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                            current.getName(),null,List.of(new SimpleGrantedAuthority(authority))));
            }
        }
        chain.doFilter(request,response);
    }
}
