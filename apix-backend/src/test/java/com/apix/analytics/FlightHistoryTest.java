package com.apix.analytics;

import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FlightHistoryTest {
    @Test void historyUsesSelectedDepartureAndDatasetAnchor() {
        var store = mock(ObservationStore.class);
        var day = LocalDate.of(2026,10,5);
        when(store.dataset("final")).thenReturn("internal");
        when(store.anchor("internal", day)).thenReturn(day);
        var observation = new ObservationStore.Observation("result", "flight", "BOM-DEL", "6E", "6E123", day, day.plusDays(21), day.atStartOfDay().toInstant(ZoneOffset.UTC), day.plusDays(21).atStartOfDay().toInstant(ZoneOffset.UTC),21,"AVAILABLE",5000.0,"daytime");
        when(store.flightHistory("internal", "flight", day)).thenReturn(List.of(observation));
        var response = new AnalyticsService(store).history("final", "flight", day);
        assertEquals("final", response.get("datasetId"));
        assertEquals("SIMULATED", response.get("dataMode"));
        assertEquals(1, response.get("sampleCount"));
        assertEquals(List.of(observation), ((Map<?,?>)response.get("data")).get("history"));
        verify(store).flightHistory("internal", "flight", day);
        verify(store).dataset("final");
        verify(store).anchor("internal", day);
        verifyNoMoreInteractions(store);
    }
    @Test void unknownDepartureReturnsAnExplicitEmptyState() {
        var store = mock(ObservationStore.class);
        var day = LocalDate.of(2026,10,5);
        when(store.dataset("final")).thenReturn("internal");
        when(store.anchor("internal", day)).thenReturn(day);
        when(store.flightHistory("internal", "missing", day)).thenReturn(List.of());
        var response = new AnalyticsService(store).history("final", "missing", day);
        assertEquals("INSUFFICIENT_DATA", ((Map<?,?>)response.get("data")).get("status"));
    }
}
