package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_source_record")
public class CommerceSourceRecord {
    @Id
    @Column(name="id", nullable=false)
    public Long id;
    @Column(name="kind", nullable=true, length=60)
    public String kind;
    @Column(name="record_json", nullable=true, columnDefinition="LONGTEXT")
    public String recordJson;
}
