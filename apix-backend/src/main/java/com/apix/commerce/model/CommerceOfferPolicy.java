package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_offer_policy")
public class CommerceOfferPolicy {
    @Id
    @Column(name="id", nullable=false)
    public Long id;
    @Column(name="airline", nullable=false, length=2)
    public String airline;
    @Column(name="code", nullable=false, length=64)
    public String code;
    @Column(name="cabin", nullable=false, length=20)
    public String cabin;
    @Column(name="cabin_bag_kg", nullable=false)
    public Integer cabinBagKg;
    @Column(name="checked_bag_kg", nullable=false)
    public Integer checkedBagKg;
    @Column(name="meal_included", nullable=false)
    public Integer mealIncluded;
    @Column(name="seat_selection_included", nullable=false)
    public Integer seatSelectionIncluded;
    @Column(name="refundable", nullable=false)
    public Integer refundable;
    @Column(name="change_fee_paise", nullable=false)
    public Long changeFeePaise;
    @Column(name="cancel_fee_paise", nullable=false)
    public Long cancelFeePaise;
    @Column(name="surcharge_paise", nullable=false)
    public Long surchargePaise;
    @Column(name="adult_multiplier_bp", nullable=false)
    public Integer adultMultiplierBp;
    @Column(name="child_multiplier_bp", nullable=false)
    public Integer childMultiplierBp;
    @Column(name="infant_fee_paise", nullable=false)
    public Long infantFeePaise;
    @Column(name="provenance", nullable=false, columnDefinition="LONGTEXT")
    public String provenance;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="airline", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceAirline airlineRef;
}
