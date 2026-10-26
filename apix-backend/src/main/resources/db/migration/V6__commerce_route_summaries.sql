-- Descriptive 21-day economy baseline summaries, not an airfare index or forecast.
CREATE TABLE cm_route_day_summary (
 route VARCHAR(7) NOT NULL,
 collection_date DATE NOT NULL,
 attempts INT NOT NULL,
 available_count INT NOT NULL,
 total_paise BIGINT NOT NULL,
 min_paise BIGINT NULL,
 max_paise BIGINT NULL,
 PRIMARY KEY (route,collection_date),
 KEY ix_cm_summary_date (collection_date,route),
 CONSTRAINT fk_cm_summary_route FOREIGN KEY (route) REFERENCES cm_route(code),
 CHECK (attempts>=available_count AND available_count>=0 AND total_paise>=0)
) ENGINE=InnoDB;
ALTER TABLE cm_schema_revision ADD CONSTRAINT fk_cm_revision_dataset
 FOREIGN KEY (parent_dataset_id) REFERENCES cm_dataset(id);
