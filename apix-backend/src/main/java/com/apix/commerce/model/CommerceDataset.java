package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_dataset")
public class CommerceDataset {
    @Id
    @Column(name="id", nullable=false, length=64)
    public String id;
    @Column(name="version", nullable=true, length=40)
    public String version;
    @Column(name="config_json", nullable=true, columnDefinition="LONGTEXT")
    public String configJson;
    @Column(name="is_synthetic", nullable=true)
    public Integer isSynthetic;
}
