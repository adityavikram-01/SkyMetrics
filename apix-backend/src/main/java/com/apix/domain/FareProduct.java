package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fare_product")
public class FareProduct extends BaseEntity {
    @Column(nullable = false, unique = true, length = 60)
    public String code;
    @Column(nullable = false, length = 20)
    public String cabin = "ECONOMY";
    @Column(nullable = false)
    public int adults = 1;
    @Column(nullable = false)
    public boolean nonstop = true;
    @Column(nullable = false)
    public boolean oneWay = true;
}
