package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "collection_run")
public class CollectionRun extends BaseEntity {
    @Column(nullable = false, length = 36)
    public String externalId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id")
    public Dataset dataset;
    @Column(nullable = false)
    public LocalDate collectionDate;
    @Column(nullable = false, columnDefinition = "DATETIME(6)")
    public Instant observedAt;
    @Column(nullable = false, length = 100)
    public String idempotencyKey;
    @Column(nullable = false, length = 64)
    public String payloadHash;
    @Column(nullable = false)
    public int resultCount;
}
