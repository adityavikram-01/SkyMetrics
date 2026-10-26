package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_route")
public class CommerceRoute {
    @Id
    @Column(name="code", nullable=false, length=64)
    public String code;
    @Column(name="origin", nullable=true, length=3)
    public String origin;
    @Column(name="destination", nullable=true, length=3)
    public String destination;
    @Column(name="duration_minutes", nullable=true)
    public Integer durationMinutes;
    @Column(name="baseline_paise", nullable=true)
    public Long baselinePaise;
    @Column(name="provenance", nullable=true, columnDefinition="LONGTEXT")
    public String provenance;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="destination", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirport destinationRef;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="origin", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirport originRef;
}
