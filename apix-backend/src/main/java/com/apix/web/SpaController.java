package com.apix.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {
    @GetMapping({"/", "/users", "/users/insights", "/users/trends", "/users/account",
            "/users/profile", "/flights", "/insights", "/market", "/login", "/help",
            "/account", "/profile", "/government", "/government/login", "/policy",
            "/developer", "/developer/login", "/developers", "/admin", "/admin/login"})
    public String app() {
        return "forward:/index.html";
    }
}
