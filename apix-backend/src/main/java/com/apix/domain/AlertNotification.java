package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "alert_notification")
public class AlertNotification extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alert_id")
    public PriceAlert alert;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "result_id")
    public CollectionResult result;
    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;
    @Column(nullable = false, columnDefinition = "DATETIME(6)")
    public Instant observedAt;
}
