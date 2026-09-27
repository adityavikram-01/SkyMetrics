package com.apix.analytics;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class AirfarePolicyIndexServiceTest {
    @Test
    void usesFixedCellsAndDeclaredRouteWeights() {
        LocalDate day = LocalDate.of(2026, 9, 13);
        Map<String, Double> base = new HashMap<>(), current = new HashMap<>();
        for (int h = 1; h <= 10; h++) {
            base.put("BOM-DEL|6E|" + h + "|daytime", 100.0);
            base.put("DEL-BOM|6E|" + h + "|daytime", 100.0);
            current.put("BOM-DEL|6E|" + h + "|daytime", 110.0);
            current.put("DEL-BOM|6E|" + h + "|daytime", 90.0);
        }
        current.put("BOM-DEL|AI|11|night", 10000.0); // unmatched cell must not affect the index
        var values = new LinkedHashMap<LocalDate, Map<String, Double>>();
        values.put(day.minusDays(30), base);
        values.put(day.minusDays(7), base);
        values.put(day.minusDays(1), base);
        values.put(day, current);
        var report = AirfarePolicyIndexService.calculate("test", day, values,
                Map.of(day.minusDays(30), 20, day.minusDays(7), 20, day.minusDays(1), 20, day, 21), Map.of("BOM-DEL", 3, "DEL-BOM", 1));
        var data = (Map<?, ?>) report.get("data");
        assertThat(data.get("index")).isEqualTo(105.0);
        assertThat(((Map<?, ?>) data.get("coverage")).get("fixedMatchedCells")).isEqualTo(20);
        assertThat(((Map<?, ?>) data.get("coverage")).get("sampledDates")).isEqualTo(4);
        assertThat(((Map<?, ?>) data.get("movements")).get("monthly")).isEqualTo(5.0);
        assertThat(((Map<?, ?>) data.get("movements")).get("daily")).isEqualTo(5.0);
        var routes = (List<Map<String, Object>>) data.get("routes");
        assertThat(routes).filteredOn(item -> item.get("route").equals("BOM-DEL"))
                .extracting(item -> item.get("dailyChangePercent")).containsExactly(10.0);
        assertThat(data.get("status")).isEqualTo("PROTOTYPE_ONLY");
    }

    @Test
    void changingSelectedDateKeepsTheSameBaseAndBasket() {
        LocalDate baseDay = LocalDate.of(2026, 8, 14);
        var base = new HashMap<String, Double>();
        var middle = new HashMap<String, Double>();
        var last = new HashMap<String, Double>();
        for (int i = 0; i < 20; i++) {
            String cell = "DEL-BOM|6E|21|band" + i;
            base.put(cell, 100.0);
            middle.put(cell, 110.0);
            last.put(cell, 120.0);
        }
        var observations = Map.of(baseDay, 20, baseDay.plusDays(1), 20, baseDay.plusDays(2), 20);
        var dates = new LinkedHashMap<LocalDate, Map<String, Double>>();
        dates.put(baseDay, base);
        dates.put(baseDay.plusDays(1), middle);
        dates.put(baseDay.plusDays(2), last);
        var first = (Map<?, ?>) AirfarePolicyIndexService.calculate("test", baseDay.plusDays(1), baseDay,
                dates, observations, Map.of("DEL-BOM", 1)).get("data");
        var second = (Map<?, ?>) AirfarePolicyIndexService.calculate("test", baseDay.plusDays(2), baseDay,
                dates, observations, Map.of("DEL-BOM", 1)).get("data");
        assertThat(first.get("baseDate")).isEqualTo(baseDay);
        assertThat(second.get("baseDate")).isEqualTo(baseDay);
        assertThat(first.get("index")).isEqualTo(110.0);
        assertThat(second.get("index")).isEqualTo(120.0);
        assertThat(first.get("series")).isEqualTo(second.get("series"));
    }
}
