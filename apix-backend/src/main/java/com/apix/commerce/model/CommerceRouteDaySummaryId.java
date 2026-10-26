package com.apix.commerce.model;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
public class CommerceRouteDaySummaryId implements Serializable {
 public String route;
 public LocalDate collectionDate;
 public CommerceRouteDaySummaryId() {}
 @Override public boolean equals(Object o) {
  return o instanceof CommerceRouteDaySummaryId other && Objects.equals(route,other.route) && Objects.equals(collectionDate,other.collectionDate);
 }
 @Override public int hashCode() { return Objects.hash(route,collectionDate); }
}
