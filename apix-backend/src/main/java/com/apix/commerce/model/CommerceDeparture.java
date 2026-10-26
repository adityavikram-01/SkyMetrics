package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_departure")
public class CommerceDeparture {
    @Id
    @Column(name="id", nullable=false)
    public Long id;
    @Column(name="service_id", nullable=true)
    public Long serviceId;
    @Column(name="travel_date", nullable=true)
    public LocalDate travelDate;
    @Column(name="departure_at", nullable=true)
    public LocalDateTime departureAt;
    @Column(name="arrival_at", nullable=true)
    public LocalDateTime arrivalAt;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="service_id", referencedColumnName="id", insertable=false, updatable=false)
    public CommerceService serviceIdRef;
}
