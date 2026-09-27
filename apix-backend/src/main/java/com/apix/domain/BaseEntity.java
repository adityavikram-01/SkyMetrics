package com.apix.domain;

import jakarta.persistence.*;

import java.time.*;
import java.math.BigDecimal;

@MappedSuperclass
public abstract class BaseEntity {
    @Id
    @Column(length = 36)
    public String id = java.util.UUID.randomUUID().toString();
}
