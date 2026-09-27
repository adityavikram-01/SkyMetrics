DELIMITER $$
CREATE TRIGGER fare_insert_guard BEFORE INSERT ON fare_observation FOR EACH ROW
BEGIN
 DECLARE business_state VARCHAR(20);
 SELECT outcome INTO business_state FROM collection_result WHERE id=NEW.result_id;
 IF business_state NOT IN ('AVAILABLE','SOLD_OUT','NO_OFFER') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Collection failures cannot have fare observations';
 END IF;
 IF (business_state='AVAILABLE' AND NEW.total_amount IS NULL) OR (business_state<>'AVAILABLE' AND NEW.total_amount IS NOT NULL) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fare amount does not match availability';
 END IF;
END$$
CREATE TRIGGER fare_no_update BEFORE UPDATE ON fare_observation FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fare history is append-only'; END$$
CREATE TRIGGER fare_no_delete BEFORE DELETE ON fare_observation FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fare history is append-only'; END$$
DELIMITER ;
