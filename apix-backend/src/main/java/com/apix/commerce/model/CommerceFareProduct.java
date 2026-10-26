package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_fare_product")
public class CommerceFareProduct {
    @Id
    @Column(name="id", nullable=false)
    public Long id;
    @Column(name="airline", nullable=true, length=2)
    public String airline;
    @Column(name="code", nullable=true, length=64)
    public String code;
    @Column(name="cabin", nullable=true, length=20)
    public String cabin;
    @Column(name="cabin_bag_kg", nullable=true)
    public Integer cabinBagKg;
    @Column(name="checked_bag_kg", nullable=true)
    public Integer checkedBagKg;
    @Column(name="meal_included", nullable=true)
    public Integer mealIncluded;
    @Column(name="seat_selection_included", nullable=true)
    public Integer seatSelectionIncluded;
    @Column(name="refundable", nullable=true)
    public Integer refundable;
    @Column(name="change_fee_paise", nullable=true)
    public Long changeFeePaise;
    @Column(name="cancel_fee_paise", nullable=true)
    public Long cancelFeePaise;
    @Column(name="surcharge_paise", nullable=true)
    public Long surchargePaise;
    @Column(name="conditions", nullable=true, columnDefinition="LONGTEXT")
    public String conditions;
    @Column(name="provenance", nullable=true, columnDefinition="LONGTEXT")
    public String provenance;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="airline", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirline airlineRef;
}
