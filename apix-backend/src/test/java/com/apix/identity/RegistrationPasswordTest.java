package com.apix.identity;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RegistrationPasswordTest {
    @Test void enforcesRegistrationPasswordRules() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String password : new String[]{"Abcdef1!", "LONGPASS9#"}) {
                assertTrue(validator.validate(new AuthController.RegisterRequest("Test", "test@example.invalid", password)).isEmpty());
            }
            for (String password : new String[]{"Abcde1!", "abcdef1!", "Abcdefg!", "Abcdef12", "Abcdef1 ", "Abcdef1é", "A1!" + "x".repeat(126)}) {
                assertFalse(validator.validate(new AuthController.RegisterRequest("Test", "test@example.invalid", password)).isEmpty());
            }
        }
    }
}
