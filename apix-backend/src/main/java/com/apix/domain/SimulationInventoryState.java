package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "simulation_inventory_state")
public class SimulationInventoryState extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "result_id", nullable = false, unique = true)
    public CollectionResult result;
    @Column(nullable = false)
    public int remaining;
    @Column(nullable = false)
    public int arrivals;
    @Column(nullable = false)
    public int cancellations;
}
