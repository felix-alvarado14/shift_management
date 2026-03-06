-- Create a reusable view for calculating effective shifts
-- Detects AC combinations (when employee works both A and C shifts on same day)
-- and treats them as a single combined 'AC' shift

CREATE OR REPLACE VIEW effective_shifts AS
SELECT
  r.load_id,
  r.employee_id,
  r.registry_date,
  CASE
    WHEN SUM(CASE WHEN r.shift_type_code = 'A' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN r.shift_type_code = 'C' THEN 1 ELSE 0 END) > 0
    THEN 'AC'
    ELSE MAX(r.shift_type_code)
  END AS effective_shift_type_code,
  MAX(r.position_code) AS position_code,
  MAX(r.sector_code) AS sector_code,
  MAX(r.shift_code_original) AS shift_code_original,
  COUNT(*) AS registry_count,
  SUM(r.registry_hours) AS total_hours,
  MAX(r.registry_counts_as_work) AS counts_as_work,
  MAX(r.registry_counts_as_operational) AS counts_as_operational,
  CONCAT(
    CASE
      WHEN SUM(CASE WHEN r.shift_type_code = 'A' THEN 1 ELSE 0 END) > 0
       AND SUM(CASE WHEN r.shift_type_code = 'C' THEN 1 ELSE 0 END) > 0
      THEN 'AC'
      ELSE MAX(r.shift_type_code)
    END,
    IFNULL(MAX(r.position_code), ''),
    IFNULL(MAX(r.sector_code), '')
  ) AS effective_shift_code
FROM registries r
WHERE r.registry_counts_as_operational = TRUE
GROUP BY r.load_id, r.employee_id, r.registry_date;
