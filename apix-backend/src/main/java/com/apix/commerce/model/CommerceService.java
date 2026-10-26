package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_service")
public class CommerceService {
    @Id
    @Column(name="id", nullable=false)
    public Long id;
    @Column(name="route", nullable=true, length=7)
    public String route;
    @Column(name="airline", nullable=true, length=2)
    public String airline;
    @Column(name="flight_number", nullable=true, length=30)
    public String flightNumber;
    @Column(name="departure_minute", nullable=true)
    public Integer departureMinute;
    @Column(name="aircraft", nullable=true, length=30)
    public String aircraft;
    @Column(name="capacity", nullable=true)
    public Integer capacity;
    @Column(name="operating_days", nullable=true, length=7)
    public String operatingDays;
    @Column(name="valid_from", nullable=true)
    public LocalDate validFrom;
    @Column(name="valid_to", nullable=true)
    public LocalDate validTo;
    @Column(name="schedule_status", nullable=true, length=50)
    public String scheduleStatus;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="airline", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirline airlineRef;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="route", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceRoute routeRef;
}
