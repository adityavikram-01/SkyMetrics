package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_service_rating")
public class CommerceServiceRating {
    @Id
    @Column(name="airline", nullable=false, length=2)
    public String airline;
    @Column(name="score", nullable=true)
    public Double score;
    @Column(name="kind", nullable=true, length=60)
    public String kind;
    @Column(name="review_count", nullable=true)
    public Integer reviewCount;
    @Column(name="method", nullable=true, columnDefinition="LONGTEXT")
    public String method;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="airline", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirline airlineRef;
}
