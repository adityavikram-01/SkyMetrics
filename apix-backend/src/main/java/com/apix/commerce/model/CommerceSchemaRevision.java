package com.apix.commerce.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="cm_schema_revision")
public class CommerceSchemaRevision {
    @Id
    @Column(name="version", nullable=false, length=40)
    public String version;
    @Column(name="parent_dataset_id", nullable=false, length=64)
    public String parentDatasetId;
    @Column(name="definition_sha256", nullable=false, length=64)
    public String definitionSha256;
    @Column(name="applied_at", nullable=false, length=255)
    public String appliedAt;
    @Column(name="notes", nullable=false, columnDefinition="LONGTEXT")
    public String notes;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="parent_dataset_id", insertable=false, updatable=false)
    public CommerceDataset datasetRef;
}
