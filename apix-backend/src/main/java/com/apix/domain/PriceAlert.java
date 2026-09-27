package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "price_alert")
public class PriceAlert extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id")
    public Dataset dataset;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id")
    public Route route;
    @Column(nullable = false)
    public LocalDate departureDate;
    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal threshold;
    @Column(nullable = false)
    public boolean active = true;
}
