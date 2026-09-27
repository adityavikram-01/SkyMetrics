package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "collection_result")
public class CollectionResult extends BaseEntity {
    @Column(nullable = false, length = 36)
    public String externalId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "run_id")
    public CollectionRun run;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "departure_id")
    public FlightDeparture departure;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    public FareProduct product;
    @Column(nullable = false)
    public int horizon;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public Outcome outcome;
}
