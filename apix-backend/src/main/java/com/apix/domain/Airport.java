package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "airport")
public class Airport extends BaseEntity {
    @Column(nullable = false, unique = true, length = 3)
    public String code;
}
