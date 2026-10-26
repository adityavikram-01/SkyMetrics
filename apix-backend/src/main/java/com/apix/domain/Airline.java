package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "airline")
public class Airline extends BaseEntity {
    @Column(nullable = false, unique = true, length = 2)
    public String code;
}
