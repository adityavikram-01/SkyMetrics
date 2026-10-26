CREATE TABLE admin_access_request (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  requested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  decided_at DATETIME(6) NULL,
  decided_by VARCHAR(36) NULL,
  CONSTRAINT fk_admin_request_user FOREIGN KEY (user_id) REFERENCES app_user(id),
  CONSTRAINT fk_admin_request_decider FOREIGN KEY (decided_by) REFERENCES app_user(id),
  CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  INDEX idx_admin_request_status (status,requested_at),
  INDEX idx_admin_request_user (user_id,requested_at)
);
