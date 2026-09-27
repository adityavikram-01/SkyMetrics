CREATE TABLE app_user (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role VARCHAR(24) NOT NULL,
  home_airport VARCHAR(3) NULL,
  preferred_airline VARCHAR(2) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CHECK (role IN ('TRAVELLER','GOV_ANALYST','PARTNER','ADMIN'))
);

CREATE TABLE saved_trip (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  route_code VARCHAR(7) NOT NULL,
  departure_date DATE NOT NULL,
  saved_fare DECIMAL(12,2) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_saved_trip_user FOREIGN KEY (user_id) REFERENCES app_user(id),
  CONSTRAINT fk_saved_trip_route FOREIGN KEY (route_code) REFERENCES route(code),
  UNIQUE (user_id,route_code,departure_date)
);

CREATE TABLE route_watch (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  route_code VARCHAR(7) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_route_watch_user FOREIGN KEY (user_id) REFERENCES app_user(id),
  CONSTRAINT fk_route_watch_route FOREIGN KEY (route_code) REFERENCES route(code),
  UNIQUE (user_id,route_code)
);

CREATE TABLE search_history (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  route_code VARCHAR(7) NOT NULL,
  departure_date DATE NOT NULL,
  last_searched_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_search_history_user FOREIGN KEY (user_id) REFERENCES app_user(id),
  UNIQUE (user_id,route_code,departure_date),
  INDEX idx_search_history_user_time (user_id,last_searched_at)
);

ALTER TABLE price_alert ADD COLUMN user_id VARCHAR(36) NULL;
ALTER TABLE price_alert ADD CONSTRAINT fk_price_alert_user FOREIGN KEY (user_id) REFERENCES app_user(id);
CREATE INDEX idx_price_alert_user ON price_alert(user_id,active);
