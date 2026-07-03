USE dexa_employee;

ALTER TABLE employees
  ADD COLUMN updated_by varchar(36) NULL COMMENT 'auth user id of the HRD admin who last modified this record';
