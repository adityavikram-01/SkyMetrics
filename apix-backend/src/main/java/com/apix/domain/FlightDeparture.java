package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "flight_departure")
public class FlightDeparture extends BaseEntity {
    @Column(nullable = false, unique = true, length = 36)
    public String externalId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id")
    public FlightService service;
    @Column(nullable = false)
    public LocalDate departureDate;
    @Column(nullable = false, columnDefinition = "DATETIME(6)")
    public Instant departureAt;
    @Column(nullable = false, columnDefinition = "DATETIME(6)")
    public Instant arrivalAt;
    @Column(nullable = false, length = 20)
    public String timeBand;
}
