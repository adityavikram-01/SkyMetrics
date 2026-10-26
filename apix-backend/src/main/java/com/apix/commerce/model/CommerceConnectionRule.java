package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_connection_rule")
public class CommerceConnectionRule {
    @Id
    @Column(name="airport", nullable=false, length=3)
    public String airport;
    @Column(name="minimum_minutes", nullable=false)
    public Integer minimumMinutes;
    @Column(name="maximum_minutes", nullable=false)
    public Integer maximumMinutes;
    @Column(name="`protected`", nullable=false)
    public Integer transferProtected;
    @Column(name="provenance", nullable=false, columnDefinition="LONGTEXT")
    public String provenance;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="airport", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirport airportRef;
}
