package com.apix.commerce.model;
import java.io.Serializable;
import java.time.*;
import java.util.Objects;
public class CommerceRatingComponentId implements Serializable {
    public String airline;
    public String component;
    public CommerceRatingComponentId() {}
    @Override public boolean equals(Object o) {
        if (this==o) return true;
        if (!(o instanceof CommerceRatingComponentId other)) return false;
        return Objects.equals(airline,other.airline) && Objects.equals(component,other.component);
    }
    @Override public int hashCode() { return Objects.hash(airline,component); }
}
