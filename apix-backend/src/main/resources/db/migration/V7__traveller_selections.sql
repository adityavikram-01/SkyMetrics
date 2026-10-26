-- Account-owned selections from the commerce dataset; old saved trips remain intact.
CREATE TABLE traveller_selection (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 kind VARCHAR(12) NOT NULL,
 selection_key VARCHAR(255) NOT NULL,
 payload JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_traveller_selection (user_id,kind,selection_key),
 CONSTRAINT fk_traveller_selection_user FOREIGN KEY(user_id) REFERENCES app_user(id),
 CHECK (kind IN ('saved','alerts'))
) ENGINE=InnoDB;
