package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_observation")
@IdClass(CommerceObservationId.class)
public class CommerceObservation {
    @Id
    @Column(name="departure_id", nullable=false)
    public Long departureId;
    @Id
    @Column(name="collection_date", nullable=false)
    public LocalDate collectionDate;
    @Column(name="horizon", nullable=true)
    public Integer horizon;
    @Column(name="outcome", nullable=true, length=20)
    public String outcome;
    @Column(name="base_paise", nullable=true)
    public Long basePaise;
    @Column(name="tax_paise", nullable=true)
    public Long taxPaise;
    @Column(name="fee_paise", nullable=true)
    public Long feePaise;
    @Column(name="bookable_seats", nullable=true)
    public Integer bookableSeats;
    @Column(name="remaining_inventory", nullable=true)
    public Integer remainingInventory;
    @Column(name="arrivals", nullable=true)
    public Integer arrivals;
    @Column(name="cancellations", nullable=true)
    public Integer cancellations;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="departure_id", referencedColumnName="id", insertable=false, updatable=false)
    public CommerceDeparture departureIdRef;
}
