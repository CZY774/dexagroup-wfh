CREATE DATABASE IF NOT EXISTS dexa_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS dexa_employee CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS dexa_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON dexa_auth.* TO 'dexa_user'@'%';
GRANT ALL PRIVILEGES ON dexa_employee.* TO 'dexa_user'@'%';
GRANT ALL PRIVILEGES ON dexa_attendance.* TO 'dexa_user'@'%';

USE dexa_auth;

CREATE TABLE IF NOT EXISTS users (
  id varchar(36) NOT NULL,
  email varchar(191) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role enum('EMPLOYEE', 'HRD_ADMIN') NOT NULL,
  active tinyint NOT NULL DEFAULT 1,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE dexa_employee;

CREATE TABLE IF NOT EXISTS employees (
  id varchar(36) NOT NULL,
  auth_user_id varchar(36) NOT NULL,
  employee_number varchar(40) NOT NULL,
  full_name varchar(160) NOT NULL,
  email varchar(191) NOT NULL,
  department varchar(120) NOT NULL,
  position varchar(120) NOT NULL,
  phone_number varchar(40) NULL,
  active tinyint NOT NULL DEFAULT 1,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_auth_user_id (auth_user_id),
  UNIQUE KEY uq_employees_employee_number (employee_number),
  UNIQUE KEY uq_employees_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE dexa_attendance;

CREATE TABLE IF NOT EXISTS attendance_records (
  id varchar(36) NOT NULL,
  employee_id varchar(36) NOT NULL,
  auth_user_id varchar(36) NOT NULL,
  attendance_date date NOT NULL,
  submitted_at datetime(3) NOT NULL,
  proof_path varchar(255) NOT NULL,
  stored_filename varchar(120) NOT NULL,
  original_filename varchar(255) NOT NULL,
  mime_type varchar(80) NOT NULL,
  file_size int NOT NULL,
  notes varchar(500) NULL,
  latitude decimal(10,7) NULL,
  longitude decimal(10,7) NULL,
  accuracy_meters decimal(8,2) NULL,
  location_captured_at datetime(3) NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_employee_date (employee_id, attendance_date),
  KEY idx_attendance_employee_id (employee_id),
  KEY idx_attendance_auth_user_id (auth_user_id),
  KEY idx_attendance_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

FLUSH PRIVILEGES;
