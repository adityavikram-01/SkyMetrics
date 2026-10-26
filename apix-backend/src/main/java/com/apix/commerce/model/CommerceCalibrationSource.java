package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_calibration_source")
public class CommerceCalibrationSource {
    @Id
    @Column(name="code", nullable=false, length=64)
    public String code;
    @Column(name="url", nullable=false, length=255)
    public String url;
    @Column(name="checked_on", nullable=false)
    public LocalDate checkedOn;
    @Column(name="scope", nullable=false, columnDefinition="LONGTEXT")
    public String scope;
}
