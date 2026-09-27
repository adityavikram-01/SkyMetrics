package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@Entity
@Table(name = "data_source")
public class DataSource extends BaseEntity {
    @Column(nullable = false, unique = true, length = 40)
    public String code;
    @Column(nullable = false)
    public boolean synthetic = true;
}
