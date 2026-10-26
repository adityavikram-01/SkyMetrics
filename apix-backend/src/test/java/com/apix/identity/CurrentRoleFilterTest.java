package com.apix.identity;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CurrentRoleFilterTest {
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void demotionRemovesAdminPermissionFromExistingSession() throws Exception {
        var jdbc=mock(JdbcTemplate.class);
        when(jdbc.query(eq("SELECT role FROM app_user WHERE email=?"), any(org.springframework.jdbc.core.RowMapper.class), eq("person@example.test")))
                .thenReturn(List.of("TRAVELLER"));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "person@example.test",null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        var request=new MockHttpServletRequest("GET","/api/v1/ops/overview");
        new CurrentRoleFilter(jdbc).doFilter(request,new MockHttpServletResponse(),new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority").containsExactly("ROLE_TRAVELLER");
    }

    @Test void removedAccountLosesAuthentication() throws Exception {
        var jdbc=mock(JdbcTemplate.class);
        when(jdbc.query(eq("SELECT role FROM app_user WHERE email=?"), any(org.springframework.jdbc.core.RowMapper.class), eq("person@example.test")))
                .thenReturn(List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "person@example.test",null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        var request=new MockHttpServletRequest("GET","/api/v1/ops/overview");
        new CurrentRoleFilter(jdbc).doFilter(request,new MockHttpServletResponse(),new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
