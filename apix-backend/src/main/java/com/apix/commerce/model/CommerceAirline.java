package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_airline")
public class CommerceAirline {
    @Id
    @Column(name="code", nullable=false, length=64)
    public String code;
    @Column(name="name", nullable=true, length=255)
    public String name;
}
