package com.apix.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GovernmentResearchControllerTest {
    @Test
    void fullHistoryAndMissingOutcomesRemainVisible() throws Exception {
        var controller = new GovernmentResearchController(new ObjectMapper());
        Map<String, Object> latest = controller.report(null);
        assertEquals("SIMULATED", latest.get("dataMode"));
        assertEquals("2024-10-06", latest.get("baseDate"));
        assertEquals(730, ((List<?>) latest.get("series")).size());
        assertEquals(24, ((List<?>) latest.get("routes")).size());
        assertTrue(((List<?>) latest.get("directionalPairs")).stream().anyMatch(row -> "DEL-PAT".equals(((Map<?, ?>) row).get("outbound"))));
        assertTrue(((Number) latest.get("fixedMatchedCells")).intValue() >= 20);
        Map<?, ?> quality = (Map<?, ?>) latest.get("quality");
        int attempted = ((Number) quality.get("attempted")).intValue();
        int classified = ((Number) quality.get("available")).intValue()
                + ((Number) quality.get("unavailable")).intValue()
                + ((Number) quality.get("collectionFailures")).intValue();
        assertEquals(attempted, classified);
        assertTrue(((Map<?, ?>) latest.get("leadTime")).containsKey("DEL-PAT"));
        assertTrue(((Map<?, ?>) latest.get("seasonality")).containsKey("DEL-PAT"));
        assertEquals(0, ((Map<?, ?>) latest.get("sourceAudit")).get("sourcesChecked"));
        assertEquals(false, ((Map<?, ?>) latest.get("indexEligibility")).get("officialPublicationEligible"));
        Map<?, ?> routeQuality = (Map<?, ?>) latest.get("routeQuality");
        assertEquals(24, routeQuality.size());
        int routeAttempts = routeQuality.values().stream().mapToInt(row -> ((Number) ((Map<?, ?>) row).get("attempted")).intValue()).sum();
        assertEquals(attempted, routeAttempts);
        assertFalse(((List<?>) latest.get("events")).isEmpty());
    }

    @Test
    void rejectsDatesOutsideCollectionWindow() throws Exception {
        var controller = new GovernmentResearchController(new ObjectMapper());
        ApiException error = assertThrows(ApiException.class, () -> controller.report(LocalDate.of(2024, 10, 5)));
        assertEquals(400, error.status);
    }

    @Test
    void exportsAreDatedAndHistoricalReportsDoNotUseLaterCohorts() throws Exception {
        var controller = new GovernmentResearchController(new ObjectMapper());
        var historical = controller.report(LocalDate.of(2025, 10, 5));
        assertEquals(365, ((List<?>) historical.get("series")).size());
        assertTrue(((Map<?, ?>) historical.get("leadTime")).isEmpty());
        assertTrue(((Map<?, ?>) historical.get("seasonality")).isEmpty());
        String csv = controller.routesCsv(LocalDate.of(2025, 10, 5)).getBody();
        assertNotNull(csv);
        assertEquals(25, csv.lines().count());
        assertTrue(csv.contains("2025-10-05,DEL-PAT,"));
        assertTrue(csv.contains(",SIMULATED,SkyMetrics synthetic generator,"));
        assertFalse(csv.contains("null"));
    }

    @Test
    void routeEvidenceAndComparisonStayDatedAndTraceable() throws Exception {
        var controller = new GovernmentResearchController(new ObjectMapper());
        var report = controller.report(null);
        LocalDate asOf = LocalDate.parse(report.get("asOf").toString());
        var route = controller.routeInvestigation("DEL-PAT", asOf);
        assertEquals("DEL-PAT", route.get("route"));
        assertEquals(730, ((List<?>) route.get("history")).size());
        assertFalse(((List<?>) route.get("cells")).isEmpty());
        for (Object item : (List<?>) route.get("cells")) {
            Map<?, ?> cell = (Map<?, ?>) item;
            assertTrue(((Number) cell.get("freshQuotes")).intValue() >= 0);
            assertTrue(((Number) cell.get("carriedDays")).intValue() <= 3);
        }
        String csv = controller.evidenceCsv("DEL-PAT", asOf).getBody();
        assertNotNull(csv);
        assertTrue(csv.startsWith("as_of,route,airline,departure_band,"));
        assertTrue(csv.contains("DEL-PAT"));
        assertTrue(csv.contains("SIMULATED,SkyMetrics synthetic generator"));

        LocalDate earlier = asOf.minusDays(30);
        var comparison = controller.comparison(asOf, earlier);
        assertEquals("SIMULATED", comparison.get("dataMode"));
        assertEquals(24, ((List<?>) comparison.get("drivers")).size());
        assertEquals(400, assertThrows(ApiException.class,
                () -> controller.comparison(asOf, asOf.plusDays(1))).status);
        assertEquals(404, assertThrows(ApiException.class,
                () -> controller.routeInvestigation("XXX-YYY", asOf)).status);
    }

    @Test
    void leadTimeMediansUseTheSameCompletedDepartures() throws Exception {
        var controller = new GovernmentResearchController(new ObjectMapper());
        Map<String, Object> latest = controller.report(null);
        Map<?, ?> all = (Map<?, ?>) latest.get("leadTime");
        for (Object values : all.values()) {
            List<?> points = (List<?>) values;
            assertEquals(6, points.size());
            int matched = ((Number) ((Map<?, ?>) points.get(0)).get("matchedDepartures")).intValue();
            assertTrue(matched > 0);
            for (Object value : points) {
                Map<?, ?> point = (Map<?, ?>) value;
                assertEquals(matched, ((Number) point.get("matchedDepartures")).intValue());
                assertEquals(matched, ((Number) point.get("observations")).intValue());
            }
        }
    }
}
