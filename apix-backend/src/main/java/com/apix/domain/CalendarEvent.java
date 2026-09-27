package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "calendar_event")
public class CalendarEvent extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id")
    public Dataset dataset;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id")
    public Route route;
    @Column(nullable = false, length = 100)
    public String name;
    @Column(nullable = false)
    public LocalDate eventDate;
    @Column(nullable = false)
    public LocalDate windowStart;
    @Column(nullable = false)
    public LocalDate windowEnd;
    @Column(nullable = false, length = 80)
    public String dateSource;
}
