CREATE TABLE employee_qualification_history (

 id INT AUTO_INCREMENT PRIMARY KEY,

 employee_id INT NOT NULL,

 qualification_id INT NOT NULL,

 effective_date DATE NOT NULL,

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);