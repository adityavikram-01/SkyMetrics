package com.apix.commerce.model;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity
@Table(name="cm_route_day_summary")
@IdClass(CommerceRouteDaySummaryId.class)
public class CommerceRouteDaySummary {
 @Id @Column(length=7) public String route;
 @Id @Column(name="collection_date") public LocalDate collectionDate;
 @Column(nullable=false) public Integer attempts;
 @Column(name="available_count",nullable=false) public Integer availableCount;
 @Column(name="total_paise",nullable=false) public Long totalPaise;
 @Column(name="min_paise") public Long minPaise;
 @Column(name="max_paise") public Long maxPaise;
 @ManyToOne(fetch=FetchType.LAZY)
 @JoinColumn(name="route",referencedColumnName="code",insertable=false,updatable=false)
 public CommerceRoute routeRef;
}
