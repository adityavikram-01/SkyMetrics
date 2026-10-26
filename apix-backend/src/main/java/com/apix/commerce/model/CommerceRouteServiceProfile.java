package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_route_service_profile")
public class CommerceRouteServiceProfile {
    @Id
    @Column(name="route", nullable=false, length=7)
    public String route;
    @Column(name="service_count", nullable=false)
    public Integer serviceCount;
    @Column(name="carrier_count", nullable=false)
    public Integer carrierCount;
    @Column(name="assignment_status", nullable=false, length=60)
    public String assignmentStatus;
    @Column(name="demand_source", nullable=false, columnDefinition="LONGTEXT")
    public String demandSource;
    @Column(name="limitations", nullable=false, columnDefinition="LONGTEXT")
    public String limitations;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="route", referencedColumnName="code", insertable=false, updatable=false)
    public CommerceRoute routeRef;
}
