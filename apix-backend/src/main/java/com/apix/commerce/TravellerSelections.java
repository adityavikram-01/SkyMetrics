package com.apix.commerce;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/traveller/selections")
public class TravellerSelections {
 private final TravellerSelectionService selections;
 public TravellerSelections(TravellerSelectionService selections) { this.selections=selections; }
 @GetMapping("/{kind}") public List<Object> list(@PathVariable String kind, Authentication auth) {
  return selections.list(kind,auth.getName());
 }
 @PutMapping("/{kind}") public Map<String,String> save(@PathVariable String kind,@RequestBody List<Map<String,Object>> entries,Authentication auth) throws Exception {
  return selections.save(kind,entries,auth.getName());
 }
}
