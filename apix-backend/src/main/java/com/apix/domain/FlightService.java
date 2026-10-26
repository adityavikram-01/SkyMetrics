package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "flight_service")
public class FlightService extends BaseEntity {
    @Column(nullable = false, unique = true, length = 36)
    public String externalId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id")
    public Route route;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "airline_id")
    public Airline airline;
    @Column(nullable = false, length = 30)
    public String flightNumber;
    @Column(nullable = false)
    public LocalTime localTime;
}
