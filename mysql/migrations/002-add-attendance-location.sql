USE dexa_attendance;

ALTER TABLE attendance_records
  ADD COLUMN latitude decimal(10,7) NULL AFTER notes,
  ADD COLUMN longitude decimal(10,7) NULL AFTER latitude,
  ADD COLUMN accuracy_meters decimal(8,2) NULL AFTER longitude,
  ADD COLUMN location_captured_at datetime(3) NULL AFTER accuracy_meters;
