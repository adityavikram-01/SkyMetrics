package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "dataset")
public class Dataset extends BaseEntity {
    @Column(nullable = false, unique = true, length = 36)
    public String externalId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_id")
    public DataSource source;
    @Column(nullable = false, length = 40)
    public String modelVersion;
    @Column(nullable = false, length = 64)
    public String configHash;
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    public String canonicalConfig;
    @Column(nullable = false)
    public boolean synthetic = true;
}
