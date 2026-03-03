CREATE DATABASE IF NOT EXISTS shift_management;
USE shift_management;

CREATE TABLE qualifications (

 qualification_id VARCHAR(10) PRIMARY KEY,  -- R, P, E, S

 qualification_name VARCHAR(50) NOT NULL,

 qualification_level INT NOT NULL,  -- 1,2,3,4

 qualification_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE employees (

 employee_id VARCHAR(20) PRIMARY KEY,

 employee_name VARCHAR(100) NOT NULL,

 employee_initials VARCHAR(10),

 qualification_id VARCHAR(10),

 employee_status VARCHAR(20) DEFAULT 'ACTIVE',

 employee_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 employee_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

 FOREIGN KEY (qualification_id)
 REFERENCES qualifications(qualification_id)

);

CREATE TABLE positions (

 position_code VARCHAR(10) PRIMARY KEY, -- R, P, E, S

 position_name VARCHAR(50) NOT NULL,

 position_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE sectors (

 sector_code VARCHAR(10) PRIMARY KEY,

 sector_name VARCHAR(50) NOT NULL,

 sector_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE shift_types (

 shift_type_code VARCHAR(10) PRIMARY KEY,  -- A, B, HO

 shift_type_name VARCHAR(50) NOT NULL,

 shift_type_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE shift_type_versions (

 shift_type_code VARCHAR(10) NOT NULL,

 version_start_date DATE NOT NULL,

 version_end_date DATE,

 version_hours DECIMAL(5,2) NOT NULL,

 version_counts_as_work BOOLEAN NOT NULL,

 version_counts_as_operational BOOLEAN NOT NULL,

 PRIMARY KEY (shift_type_code, version_start_date),

 FOREIGN KEY (shift_type_code)
 REFERENCES shift_types(shift_type_code)

);

CREATE TABLE special_codes (

 special_code VARCHAR(10) PRIMARY KEY, -- L, I, VAC, CAP

 special_code_name VARCHAR(50) NOT NULL,

 special_code_counts_as_work BOOLEAN NOT NULL,

 special_code_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE loads (

 load_id INT AUTO_INCREMENT PRIMARY KEY,

 load_file_name VARCHAR(255) NOT NULL,

 load_file_path VARCHAR(500),  -- si lo guardas en disco

 load_year INT NOT NULL,

 load_month INT NOT NULL,

 load_type ENUM('P','R') NOT NULL, -- Planificado / Real

 load_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE registries (

 registry_id INT AUTO_INCREMENT PRIMARY KEY,

 load_id INT NOT NULL,

 employee_id VARCHAR(20) NOT NULL,

 registry_date DATE NOT NULL,

 shift_code_original VARCHAR(10) NOT NULL,

 shift_type_code VARCHAR(10),

 special_code VARCHAR(10),

 position_code VARCHAR(10),

 sector_code VARCHAR(10),

 registry_hours DECIMAL(5,2) NOT NULL DEFAULT 0,

 registry_counts_as_work BOOLEAN NOT NULL DEFAULT FALSE,

 registry_counts_as_operational BOOLEAN NOT NULL DEFAULT FALSE,

 registry_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (load_id)
 REFERENCES loads(load_id),

 FOREIGN KEY (employee_id)
 REFERENCES employees(employee_id),

 FOREIGN KEY (shift_type_code)
 REFERENCES shift_types(shift_type_code),

 FOREIGN KEY (special_code)
 REFERENCES special_codes(special_code),

 FOREIGN KEY (position_code)
 REFERENCES positions(position_code),

 FOREIGN KEY (sector_code)
 REFERENCES sectors(sector_code)

);

CREATE INDEX idx_registry_employee_date
ON registries(employee_id, registry_date);

CREATE INDEX idx_registry_load
ON registries(load_id);

CREATE INDEX idx_registry_date
ON registries(registry_date);