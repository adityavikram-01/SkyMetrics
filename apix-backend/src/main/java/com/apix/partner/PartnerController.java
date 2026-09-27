package com.apix.partner;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/partner")
public class PartnerController {
    @GetMapping("/overview")
    public Map<String,Object> overview() {
        return Map.of(
                "status","PARTNER_PREVIEW",
                "dataMode","SIMULATED",
                "apiKeyIssuance","NOT_ENABLED",
                "availableProducts",List.of("fare-history","price-intelligence","route-statistics","airfare-index"),
                "note","Partner access is role-protected. API keys, quotas, billing and exports are not enabled yet."
        );
    }
}
