package com.apix.commerce.model;
import java.io.Serializable;
import java.time.*;
import java.util.Objects;
public class CommerceObservationId implements Serializable {
    public Long departureId;
    public LocalDate collectionDate;
    public CommerceObservationId() {}
    @Override public boolean equals(Object o) {
        if (this==o) return true;
        if (!(o instanceof CommerceObservationId other)) return false;
        return Objects.equals(departureId,other.departureId) && Objects.equals(collectionDate,other.collectionDate);
    }
    @Override public int hashCode() { return Objects.hash(departureId,collectionDate); }
}
