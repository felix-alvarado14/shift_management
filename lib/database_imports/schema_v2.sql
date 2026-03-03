CREATE DATABASE IF NOT EXISTS shift_management;
USE shift_management;

-- =====================================================
-- QUALIFICATIONS (HABILITACIONES)
-- =====================================================

CREATE TABLE qualifications (

 qualification_id VARCHAR(10) PRIMARY KEY,

 qualification_name VARCHAR(50) NOT NULL,

 qualification_description VARCHAR(255),

 qualification_level INT NOT NULL,

 qualification_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================================
-- EMPLOYEES
-- =====================================================

CREATE TABLE employees (

 employee_id VARCHAR(20) PRIMARY KEY,

 employee_name VARCHAR(100) NOT NULL,

 qualification_id VARCHAR(10) NOT NULL,

 employee_status VARCHAR(20) DEFAULT 'ACTIVE',

 employee_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 employee_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

 FOREIGN KEY (qualification_id)
 REFERENCES qualifications(qualification_id)

);

-- =====================================================
-- SHIFT TYPES (TURNOS)
-- A, B, HO, etc
-- =====================================================

CREATE TABLE shift_types (

 shift_type_code VARCHAR(10) PRIMARY KEY, -- A, B, HO

 shift_type_name VARCHAR(50) NOT NULL,

 shift_type_hours DECIMAL(4,2) NOT NULL,

 shift_type_counts_as_work BOOLEAN NOT NULL,

 shift_type_counts_as_operational BOOLEAN NOT NULL,

 shift_type_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================================
-- POSITIONS (PUESTOS)
-- P, S, etc
-- =====================================================

CREATE TABLE positions (

 position_code VARCHAR(10) PRIMARY KEY,

 position_name VARCHAR(50) NOT NULL,

 qualification_id VARCHAR(10) NOT NULL,

 position_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (qualification_id)
 REFERENCES qualifications(qualification_id)

);

-- =====================================================
-- SECTORS
-- 1, 2, 3
-- =====================================================

CREATE TABLE sectors (

 sector_code VARCHAR(10) PRIMARY KEY,

 sector_name VARCHAR(50) NOT NULL,

 sector_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================================
-- SPECIAL CODES
-- HO, l, I, etc
-- =====================================================

CREATE TABLE special_codes (

 special_code VARCHAR(10) PRIMARY KEY,

 special_code_name VARCHAR(50) NOT NULL,

 special_code_counts_as_work BOOLEAN NOT NULL,

 special_code_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

);

-- =====================================================
-- SOURCE FILES
-- =====================================================

CREATE TABLE source_files (

 source_file_id INT AUTO_INCREMENT PRIMARY KEY,

 source_file_name VARCHAR(255) NOT NULL,

 source_file_type ENUM('PLANNED','ACTUAL') NOT NULL,

 source_file_period_year INT NOT NULL,

 source_file_period_month INT NOT NULL,

 source_file_uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================================
-- SHIFTS (GENÉRICO: planificado o real)
-- =====================================================

CREATE TABLE shifts (

 shift_id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id VARCHAR(20) NOT NULL,

 shift_date DATE NOT NULL,

 shift_code_original VARCHAR(10) NOT NULL,

 shift_type_code VARCHAR(10),

 position_code VARCHAR(10),

 sector_code VARCHAR(10),

 special_code VARCHAR(10),

 source_file_id INT NOT NULL,

 shift_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (employee_id)
 REFERENCES employees(employee_id),

 FOREIGN KEY (shift_type_code)
 REFERENCES shift_types(shift_type_code),

 FOREIGN KEY (position_code)
 REFERENCES positions(position_code),

 FOREIGN KEY (sector_code)
 REFERENCES sectors(sector_code),

 FOREIGN KEY (special_code)
 REFERENCES special_codes(special_code),

 FOREIGN KEY (source_file_id)
 REFERENCES source_files(source_file_id)

);

-- =====================================================
-- INDEXES IMPORTANTES
-- =====================================================

CREATE INDEX idx_shift_employee_date
ON shifts(employee_id, shift_date);

CREATE INDEX idx_shift_code
ON shifts(shift_code_original);