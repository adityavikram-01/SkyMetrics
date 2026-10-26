package com.apix.commerce;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.Map;
@RestController
@RequestMapping("/api/v1/traveller")
public class TravellerController {
 private final TravellerData data;
 public TravellerController(TravellerData data) { this.data=data; }
 @GetMapping("/search") public Map<String,Object> search(@RequestParam(defaultValue="BOM-DEL") String route,@RequestParam(required=false) LocalDate date) { return data.search(route,date); }
 @GetMapping("/trends") public Map<String,Object> trends(@RequestParam(defaultValue="7") int days) { return data.trends(days); }
}
