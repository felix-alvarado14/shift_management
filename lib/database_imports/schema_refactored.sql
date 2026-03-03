CREATE DATABASE IF NOT EXISTS shift_management;

USE shift_management;

-- ============================================
-- QUALIFICATIONS
-- ============================================

CREATE TABLE qualifications (

 qualification_id VARCHAR(50) PRIMARY KEY,

 qualification_name VARCHAR(100) NOT NULL,

 qualification_level INT NOT NULL,

 qualification_description VARCHAR(255),

 qualification_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ============================================
-- EMPLOYEES
-- ============================================

CREATE TABLE employees (

 employee_id VARCHAR(50) PRIMARY KEY,

 employee_name VARCHAR(150) NOT NULL,

 employee_initials VARCHAR(2) NOT NULL,

 qualification_id VARCHAR(50) NOT NULL,

 employee_status VARCHAR(20) DEFAULT 'ACTIVE',

 employee_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 employee_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

 CONSTRAINT fk_employee_qualification

 FOREIGN KEY (qualification_id)

 REFERENCES qualifications(qualification_id)

);

-- ============================================
-- SECTORS
-- ============================================

CREATE TABLE sectors (

 sector_id VARCHAR(50) PRIMARY KEY,

 sector_name VARCHAR(100) NOT NULL,

 sector_description VARCHAR(255),

 sector_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ============================================
-- SHIFT TYPES
-- ============================================

CREATE TABLE shift_types (

 shift_type_id VARCHAR(50) PRIMARY KEY,

 shift_type_name VARCHAR(50) NOT NULL,

 shift_type_start_time TIME,

 shift_type_end_time TIME,

 shift_type_duration_hours DECIMAL(5,2),

 shift_type_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ============================================
-- SOURCE FILES
-- ============================================

CREATE TABLE source_files (

 source_file_id INT AUTO_INCREMENT PRIMARY KEY,

 source_file_name VARCHAR(255) NOT NULL,

 source_file_type ENUM('PLANNED','ACTUAL') NOT NULL,

 source_file_period_start DATE,

 source_file_period_end DATE,

 source_file_uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ============================================
-- PLANNED SHIFTS
-- ============================================

CREATE TABLE planned_shifts (

 planned_shift_id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id VARCHAR(50) NOT NULL,

 sector_id VARCHAR(50) NOT NULL,

 shift_type_id VARCHAR(50) NOT NULL,

 planned_shift_date DATE NOT NULL,

 source_file_id INT NOT NULL,

 planned_shift_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(employee_id)
 ON DELETE CASCADE,

 FOREIGN KEY (sector_id)
 REFERENCES sectors(sector_id),

 FOREIGN KEY (shift_type_id)
 REFERENCES shift_types(shift_type_id),

 FOREIGN KEY (source_file_id)
 REFERENCES source_files(source_file_id)

);

-- ============================================
-- ACTUAL SHIFTS
-- ============================================

CREATE TABLE actual_shifts (

 actual_shift_id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id VARCHAR(50) NOT NULL,

 sector_id VARCHAR(50) NOT NULL,

 shift_type_id VARCHAR(50) NOT NULL,

 actual_shift_date DATE NOT NULL,

 source_file_id INT NOT NULL,

 actual_shift_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(employee_id)
 ON DELETE CASCADE,

 FOREIGN KEY (sector_id)
 REFERENCES sectors(sector_id),

 FOREIGN KEY (shift_type_id)
 REFERENCES shift_types(shift_type_id),

 FOREIGN KEY (source_file_id)
 REFERENCES source_files(source_file_id)

);

-- ============================================
-- INCIDENT TYPES
-- ============================================

CREATE TABLE incident_types (

 incident_type_id VARCHAR(50) PRIMARY KEY,

 incident_type_name VARCHAR(100) NOT NULL,

 incident_type_affects_hours BOOLEAN DEFAULT TRUE,

 incident_type_description VARCHAR(255),

 incident_type_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ============================================
-- INCIDENTS
-- ============================================

CREATE TABLE incidents (

 incident_id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id VARCHAR(50) NOT NULL,

 incident_type_id VARCHAR(50) NOT NULL,

 incident_date DATE NOT NULL,

 planned_shift_id INT NULL,

 actual_shift_id INT NULL,

 incident_description VARCHAR(255),

 incident_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(employee_id),

 FOREIGN KEY (incident_type_id)
 REFERENCES incident_types(incident_type_id),

 FOREIGN KEY (planned_shift_id)
 REFERENCES planned_shifts(planned_shift_id),

 FOREIGN KEY (actual_shift_id)
 REFERENCES actual_shifts(actual_shift_id)

);

-- ============================================
-- ANALYSIS RUNS
-- ============================================

CREATE TABLE analysis_runs (

 analysis_run_id INT AUTO_INCREMENT PRIMARY KEY,

 planned_source_file_id INT NOT NULL,

 actual_source_file_id INT NOT NULL,

 analysis_run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 analysis_run_status VARCHAR(50),

 FOREIGN KEY (planned_source_file_id)
 REFERENCES source_files(source_file_id),

 FOREIGN KEY (actual_source_file_id)
 REFERENCES source_files(source_file_id)

);

-- ============================================
-- EMPLOYEE METRICS
-- ============================================

CREATE TABLE employee_metrics (

 employee_metric_id INT AUTO_INCREMENT PRIMARY KEY,

 analysis_run_id INT NOT NULL,

 employee_id VARCHAR(50) NOT NULL,

 employee_metric_planned_hours DECIMAL(8,2),

 employee_metric_actual_hours DECIMAL(8,2),

 employee_metric_difference_hours DECIMAL(8,2),

 employee_metric_overtime_hours DECIMAL(8,2),

 employee_metric_compliance_percentage DECIMAL(5,2),

 employee_metric_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (analysis_run_id)
 REFERENCES analysis_runs(analysis_run_id),

 FOREIGN KEY (employee_id)
 REFERENCES employees(employee_id)

);