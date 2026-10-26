package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_service_cabin")
@IdClass(CommerceServiceCabinId.class)
public class CommerceServiceCabin {
    @Id
    @Column(name="service_id", nullable=false)
    public Long serviceId;
    @Id
    @Column(name="cabin", nullable=false, length=20)
    public String cabin;
    @Column(name="capacity", nullable=false)
    public Integer capacity;
    @Column(name="price_multiplier_bp", nullable=false)
    public Integer priceMultiplierBp;
    @Column(name="inventory_method", nullable=false, columnDefinition="LONGTEXT")
    public String inventoryMethod;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="service_id", referencedColumnName="id", insertable=false, updatable=false)
    public CommerceService serviceIdRef;
}
