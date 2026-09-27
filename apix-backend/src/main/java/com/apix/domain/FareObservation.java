package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fare_observation")
public class FareObservation extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "result_id", nullable = false, unique = true)
    public CollectionResult result;
    @Column(precision = 12, scale = 2)
    public BigDecimal totalAmount;
    @Column(nullable = false, length = 3)
    public String currency = "INR";
    @Column(nullable = false)
    public boolean synthetic = true;
}
