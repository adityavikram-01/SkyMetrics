package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_airport")
public class CommerceAirport {
    @Id
    @Column(name="code", nullable=false, length=64)
    public String code;
    @Column(name="name", nullable=true, length=255)
    public String name;
    @Column(name="timezone", nullable=true, length=40)
    public String timezone;
}
