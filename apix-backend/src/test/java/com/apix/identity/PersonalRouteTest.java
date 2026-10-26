package com.apix.identity;

import com.apix.analytics.FinalMimicStore;
import com.apix.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PersonalRouteTest {
    @Test void validatesWatchedRoutesAgainstTheActiveDataset() {
        var jdbc=mock(JdbcTemplate.class);
        var mimic=mock(FinalMimicStore.class);
        when(mimic.enabled()).thenReturn(true);
        when(mimic.containsRoute("BOM-DEL")).thenReturn(true);
        when(jdbc.queryForObject("SELECT id FROM app_user WHERE email=?",String.class,"test@example.invalid")).thenReturn("test-user");
        var controller=new PersonalController(jdbc,mock(PasswordEncoder.class),mimic);
        var auth=new UsernamePasswordAuthenticationToken("test@example.invalid",null,java.util.List.of());
        assertEquals("watching",controller.watch(new PersonalController.WatchRequest("BOM-DEL"),auth).get("status"));
        assertThrows(ApiException.class,()->controller.watch(new PersonalController.WatchRequest("XXX-YYY"),auth));
        verify(jdbc,never()).queryForObject("SELECT COUNT(*) FROM route WHERE code=?",Integer.class,"BOM-DEL");
    }
}
