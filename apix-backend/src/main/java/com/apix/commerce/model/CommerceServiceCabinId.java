package com.apix.commerce.model;
import java.io.Serializable;
import java.time.*;
import java.util.Objects;
public class CommerceServiceCabinId implements Serializable {
    public Long serviceId;
    public String cabin;
    public CommerceServiceCabinId() {}
    @Override public boolean equals(Object o) {
        if (this==o) return true;
        if (!(o instanceof CommerceServiceCabinId other)) return false;
        return Objects.equals(serviceId,other.serviceId) && Objects.equals(cabin,other.cabin);
    }
    @Override public int hashCode() { return Objects.hash(serviceId,cabin); }
}
