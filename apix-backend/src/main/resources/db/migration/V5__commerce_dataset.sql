-- Commerce dataset: additive tables; existing application data stays intact.

-- UTC instants and collection dates are converted from SQLite ordinals during import.

CREATE TABLE cm_dataset (
    `id` VARCHAR(64) NOT NULL,
    `version` VARCHAR(40),
    `config_json` LONGTEXT,
    `is_synthetic` INT,
    PRIMARY KEY (`id`),
    CHECK (is_synthetic=1)
) ENGINE=InnoDB;

CREATE TABLE cm_airport (
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255),
    `timezone` VARCHAR(40),
    PRIMARY KEY (`code`)
) ENGINE=InnoDB;

CREATE TABLE cm_airline (
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255),
    PRIMARY KEY (`code`)
) ENGINE=InnoDB;

CREATE TABLE cm_route (
    `code` VARCHAR(64) NOT NULL,
    `origin` VARCHAR(3),
    `destination` VARCHAR(3),
    `duration_minutes` INT,
    `baseline_paise` BIGINT,
    `provenance` LONGTEXT,
    PRIMARY KEY (`code`),
    CONSTRAINT fk_cm_route_destination FOREIGN KEY (`destination`) REFERENCES cm_airport (`code`),
    CONSTRAINT fk_cm_route_origin FOREIGN KEY (`origin`) REFERENCES cm_airport (`code`),
    UNIQUE KEY uq_cm_route_airports (origin,destination),
    CHECK (origin <> destination)
) ENGINE=InnoDB;

CREATE TABLE cm_service (
    `id` BIGINT NOT NULL,
    `route` VARCHAR(7),
    `airline` VARCHAR(2),
    `flight_number` VARCHAR(30),
    `departure_minute` INT,
    `aircraft` VARCHAR(30),
    `capacity` INT,
    `operating_days` VARCHAR(7),
    `valid_from` DATE,
    `valid_to` DATE,
    `schedule_status` VARCHAR(50),
    PRIMARY KEY (`id`),
    CONSTRAINT fk_cm_service_airline FOREIGN KEY (`airline`) REFERENCES cm_airline (`code`),
    CONSTRAINT fk_cm_service_route FOREIGN KEY (`route`) REFERENCES cm_route (`code`),
    UNIQUE KEY uq_cm_service_flight (flight_number),
    KEY ix_cm_service_route (route,airline,id),
    CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE cm_departure (
    `id` BIGINT NOT NULL,
    `service_id` BIGINT,
    `travel_date` DATE,
    `departure_at` DATETIME(6),
    `arrival_at` DATETIME(6),
    PRIMARY KEY (`id`),
    CONSTRAINT fk_cm_departure_service_id FOREIGN KEY (`service_id`) REFERENCES cm_service (`id`),
    UNIQUE KEY uq_cm_departure_service_date (service_id,travel_date),
    KEY ix_cm_departure_date_service (travel_date,service_id,id),
    CHECK (arrival_at > departure_at)
) ENGINE=InnoDB;

CREATE TABLE cm_fare_product (
    `id` BIGINT NOT NULL,
    `airline` VARCHAR(2),
    `code` VARCHAR(64),
    `cabin` VARCHAR(20),
    `cabin_bag_kg` INT,
    `checked_bag_kg` INT,
    `meal_included` INT,
    `seat_selection_included` INT,
    `refundable` INT,
    `change_fee_paise` BIGINT,
    `cancel_fee_paise` BIGINT,
    `surcharge_paise` BIGINT,
    `conditions` LONGTEXT,
    `provenance` LONGTEXT,
    PRIMARY KEY (`id`),
    CONSTRAINT fk_cm_fare_product_airline FOREIGN KEY (`airline`) REFERENCES cm_airline (`code`)
) ENGINE=InnoDB;

CREATE TABLE cm_service_rating (
    `airline` VARCHAR(2) NOT NULL,
    `score` DOUBLE,
    `kind` VARCHAR(60),
    `review_count` INT,
    `method` LONGTEXT,
    PRIMARY KEY (`airline`),
    CONSTRAINT fk_cm_service_rating_airline FOREIGN KEY (`airline`) REFERENCES cm_airline (`code`),
    CHECK (score BETWEEN 1 AND 5),
    CHECK (review_count IS NULL)
) ENGINE=InnoDB;

CREATE TABLE cm_source_record (
    `id` BIGINT NOT NULL,
    `kind` VARCHAR(60),
    `record_json` LONGTEXT,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE cm_schema_revision (
    `version` VARCHAR(40) NOT NULL,
    `parent_dataset_id` VARCHAR(64) NOT NULL,
    `definition_sha256` VARCHAR(64) NOT NULL,
    `applied_at` VARCHAR(255) NOT NULL,
    `notes` LONGTEXT NOT NULL,
    PRIMARY KEY (`version`)
) ENGINE=InnoDB;

CREATE TABLE cm_calibration_source (
    `code` VARCHAR(64) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `checked_on` DATE NOT NULL,
    `scope` LONGTEXT NOT NULL,
    PRIMARY KEY (`code`)
) ENGINE=InnoDB;

CREATE TABLE cm_offer_policy (
    `id` BIGINT NOT NULL,
    `airline` VARCHAR(2) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `cabin` VARCHAR(20) NOT NULL,
    `cabin_bag_kg` INT NOT NULL,
    `checked_bag_kg` INT NOT NULL,
    `meal_included` INT NOT NULL,
    `seat_selection_included` INT NOT NULL,
    `refundable` INT NOT NULL,
    `change_fee_paise` BIGINT NOT NULL,
    `cancel_fee_paise` BIGINT NOT NULL,
    `surcharge_paise` BIGINT NOT NULL,
    `adult_multiplier_bp` INT NOT NULL,
    `child_multiplier_bp` INT NOT NULL,
    `infant_fee_paise` BIGINT NOT NULL,
    `provenance` LONGTEXT NOT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT fk_cm_offer_policy_airline FOREIGN KEY (`airline`) REFERENCES cm_airline (`code`),
    UNIQUE KEY uq_cm_policy (airline,code,cabin),
    KEY ix_cm_policy_filter (airline,cabin,checked_bag_kg,refundable),
    CHECK (surcharge_paise >= 0 AND checked_bag_kg >= 0)
) ENGINE=InnoDB;

CREATE TABLE cm_service_cabin (
    `service_id` BIGINT NOT NULL,
    `cabin` VARCHAR(20) NOT NULL,
    `capacity` INT NOT NULL,
    `price_multiplier_bp` INT NOT NULL,
    `inventory_method` LONGTEXT NOT NULL,
    PRIMARY KEY (`service_id`,`cabin`),
    CONSTRAINT fk_cm_service_cabin_service_id FOREIGN KEY (`service_id`) REFERENCES cm_service (`id`),
    CHECK (capacity > 0 AND price_multiplier_bp >= 10000)
) ENGINE=InnoDB;

CREATE TABLE cm_rating_component (
    `airline` VARCHAR(2) NOT NULL,
    `component` VARCHAR(40) NOT NULL,
    `score` DOUBLE NOT NULL,
    `weight` DOUBLE NOT NULL,
    `provenance` LONGTEXT NOT NULL,
    PRIMARY KEY (`airline`,`component`),
    CONSTRAINT fk_cm_rating_component_airline FOREIGN KEY (`airline`) REFERENCES cm_airline (`code`),
    CHECK (score BETWEEN 1 AND 5 AND weight > 0)
) ENGINE=InnoDB;

CREATE TABLE cm_route_service_profile (
    `route` VARCHAR(7) NOT NULL,
    `service_count` INT NOT NULL,
    `carrier_count` INT NOT NULL,
    `assignment_status` VARCHAR(60) NOT NULL,
    `demand_source` LONGTEXT NOT NULL,
    `limitations` LONGTEXT NOT NULL,
    PRIMARY KEY (`route`),
    CONSTRAINT fk_cm_route_service_profile_route FOREIGN KEY (`route`) REFERENCES cm_route (`code`)
) ENGINE=InnoDB;

CREATE TABLE cm_connection_rule (
    `airport` VARCHAR(3) NOT NULL,
    `minimum_minutes` INT NOT NULL,
    `maximum_minutes` INT NOT NULL,
    `protected` INT NOT NULL,
    `provenance` LONGTEXT NOT NULL,
    PRIMARY KEY (`airport`),
    CONSTRAINT fk_cm_connection_rule_airport FOREIGN KEY (`airport`) REFERENCES cm_airport (`code`),
    CHECK (minimum_minutes > 0 AND maximum_minutes >= minimum_minutes),
    CHECK (`protected`=0)
) ENGINE=InnoDB;

CREATE TABLE cm_observation (
    `departure_id` BIGINT NOT NULL,
    `collection_date` DATE NOT NULL,
    `horizon` INT,
    `outcome` VARCHAR(20),
    `base_paise` BIGINT,
    `tax_paise` BIGINT,
    `fee_paise` BIGINT,
    `bookable_seats` INT,
    `remaining_inventory` INT,
    `arrivals` INT,
    `cancellations` INT,
    PRIMARY KEY (`departure_id`,`collection_date`),
    CONSTRAINT fk_cm_observation_departure_id FOREIGN KEY (`departure_id`) REFERENCES cm_departure (`id`),
    KEY ix_cm_observation_collection (collection_date,departure_id),
    CHECK (horizon BETWEEN 1 AND 60),
    CHECK (remaining_inventory >= 0 AND arrivals >= 0 AND cancellations >= 0),
    CHECK (outcome IN ('AVAILABLE','SOLD_OUT','NO_OFFER','TIMEOUT','PARSE_ERROR','RATE_LIMITED')),
    CHECK ((outcome='AVAILABLE' AND base_paise IS NOT NULL AND base_paise>0 AND tax_paise IS NOT NULL AND tax_paise>=0 AND fee_paise IS NOT NULL AND fee_paise>=0 AND bookable_seats IS NOT NULL AND bookable_seats>0 AND bookable_seats<=remaining_inventory) OR (outcome<>'AVAILABLE' AND base_paise IS NULL AND tax_paise IS NULL AND fee_paise IS NULL AND bookable_seats IS NULL))
) ENGINE=InnoDB;

CREATE TABLE cm_import_checkpoint (
 source_id VARCHAR(64) NOT NULL, table_name VARCHAR(64) NOT NULL, chunk_number INT NOT NULL,
 row_count BIGINT NOT NULL, imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(source_id,table_name,chunk_number)
) ENGINE=InnoDB;
