package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_rating_component")
@IdClass(CommerceRatingComponentId.class)
public class CommerceRatingComponent {
    @Id
    @Column(name="airline", nullable=false, length=2)
    public String airline;
    @Id
    @Column(name="component", nullable=false, length=40)
    public String component;
    @Column(name="score", nullable=false)
    public Double score;
    @Column(name="weight", nullable=false)
    public Double weight;
    @Column(name="provenance", nullable=false, columnDefinition="LONGTEXT")
    public String provenance;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="airline", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirline airlineRef;
}
