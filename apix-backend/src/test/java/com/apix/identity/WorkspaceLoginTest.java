package com.apix.identity;

import com.apix.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WorkspaceLoginTest {
    @Test void travellerCannotStartGovernmentSession() {
        var jdbc=mock(JdbcTemplate.class);
        var passwords=mock(PasswordEncoder.class);
        var contexts=mock(SecurityContextRepository.class);
        var mail=mock(AccountMailService.class);
        when(jdbc.query(eq("SELECT password_hash,role FROM app_user WHERE email=?"), any(org.springframework.jdbc.core.RowMapper.class), eq("traveller@example.test")))
                .thenReturn(java.util.Collections.singletonList(new String[]{"encoded", "TRAVELLER"}));
        when(passwords.matches("correct-password", "encoded")).thenReturn(true);
        var auth=new AuthController(jdbc,passwords,contexts,mail);
        var request=new MockHttpServletRequest("POST","/api/v1/auth/government/login");
        var response=new MockHttpServletResponse();

        assertThatThrownBy(() -> auth.workspaceLogin("government",new AuthController.LoginRequest("traveller@example.test","correct-password"),request,response))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(401);
        verifyNoInteractions(contexts,mail);
    }

    @Test void unknownWorkspaceIsRejectedBeforePasswordLookup() {
        var jdbc=mock(JdbcTemplate.class);
        var auth=new AuthController(jdbc,mock(PasswordEncoder.class),mock(SecurityContextRepository.class),mock(AccountMailService.class));
        assertThatThrownBy(() -> auth.workspaceLogin("unknown",new AuthController.LoginRequest("a@example.test","password"),new MockHttpServletRequest(),new MockHttpServletResponse()))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(404);
        verifyNoInteractions(jdbc);
    }
}
