-- ============================================
-- DATABASE
-- ============================================

CREATE DATABASE IF NOT EXISTS shift_management;
USE shift_management;

-- ============================================
-- QUALIFICATIONS
-- ============================================

CREATE TABLE qualifications (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(50) NOT NULL,
 level INT NOT NULL,
 description VARCHAR(255),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EMPLOYEES
-- ============================================

CREATE TABLE employees (
 id INT AUTO_INCREMENT PRIMARY KEY,
 employee_code VARCHAR(50),
 name VARCHAR(100) NOT NULL,
 qualification_id INT NOT NULL,
 status VARCHAR(20) DEFAULT 'ACTIVE',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (qualification_id)
 REFERENCES qualifications(id)
);

-- ============================================
-- SECTORS
-- ============================================

CREATE TABLE sectors (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 description VARCHAR(255),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHIFT TYPES
-- ============================================

CREATE TABLE shift_types (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(50) NOT NULL,
 start_time TIME,
 end_time TIME,
 duration_hours DECIMAL(5,2),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SOURCE FILES
-- ============================================

CREATE TABLE source_files (
 id INT AUTO_INCREMENT PRIMARY KEY,
 file_name VARCHAR(255) NOT NULL,
 file_type ENUM('PLANNED','ACTUAL') NOT NULL,
 period_start DATE,
 period_end DATE,
 uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PLANNED SHIFTS
-- ============================================

CREATE TABLE planned_shifts (
 id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id INT NOT NULL,
 sector_id INT NOT NULL,
 shift_type_id INT NOT NULL,

 shift_date DATE NOT NULL,

 source_file_id INT NOT NULL,

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(id),

 FOREIGN KEY (sector_id)
 REFERENCES sectors(id),

 FOREIGN KEY (shift_type_id)
 REFERENCES shift_types(id),

 FOREIGN KEY (source_file_id)
 REFERENCES source_files(id)
);

-- ============================================
-- ACTUAL SHIFTS
-- ============================================

CREATE TABLE actual_shifts (
 id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id INT NOT NULL,
 sector_id INT NOT NULL,
 shift_type_id INT NOT NULL,

 shift_date DATE NOT NULL,

 source_file_id INT NOT NULL,

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(id),

 FOREIGN KEY (sector_id)
 REFERENCES sectors(id),

 FOREIGN KEY (shift_type_id)
 REFERENCES shift_types(id),

 FOREIGN KEY (source_file_id)
 REFERENCES source_files(id)
);

-- ============================================
-- INCIDENT TYPES
-- ============================================

CREATE TABLE incident_types (
 id INT AUTO_INCREMENT PRIMARY KEY,

 code VARCHAR(50) UNIQUE NOT NULL,
 name VARCHAR(100) NOT NULL,

 affects_hours BOOLEAN DEFAULT TRUE,

 description VARCHAR(255),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INCIDENTS
-- ============================================

CREATE TABLE incidents (
 id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id INT NOT NULL,

 incident_type_id INT NOT NULL,

 incident_date DATE NOT NULL,

 planned_shift_id INT NULL,
 actual_shift_id INT NULL,

 description VARCHAR(255),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(id),

 FOREIGN KEY (incident_type_id)
 REFERENCES incident_types(id),

 FOREIGN KEY (planned_shift_id)
 REFERENCES planned_shifts(id),

 FOREIGN KEY (actual_shift_id)
 REFERENCES actual_shifts(id)
);

-- ============================================
-- ANALYSIS RUNS
-- ============================================

CREATE TABLE analysis_runs (

 id INT AUTO_INCREMENT PRIMARY KEY,

 planned_file_id INT NOT NULL,

 actual_file_id INT NOT NULL,

 run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 status VARCHAR(50),

 FOREIGN KEY (planned_file_id)
 REFERENCES source_files(id),

 FOREIGN KEY (actual_file_id)
 REFERENCES source_files(id)

);

-- ============================================
-- EMPLOYEE METRICS
-- ============================================

CREATE TABLE employee_metrics (

 id INT AUTO_INCREMENT PRIMARY KEY,

 analysis_run_id INT NOT NULL,

 employee_id INT NOT NULL,

 planned_hours DECIMAL(8,2),

 actual_hours DECIMAL(8,2),

 difference_hours DECIMAL(8,2),

 overtime_hours DECIMAL(8,2),

 compliance_percentage DECIMAL(5,2),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (analysis_run_id)
 REFERENCES analysis_runs(id),

 FOREIGN KEY (employee_id)
 REFERENCES employees(id)

);