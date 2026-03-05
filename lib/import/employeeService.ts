/**
 * Insert or update employee with qualification
 */
export async function upsertEmployee(
  connection: any,
  employeeId: string,
  employeeName: string,
  employeeInitials: string,
  qualificationId: string | null
): Promise<void> {
  const query = `
    INSERT INTO employees (employee_id, employee_name, employee_initials, qualification_id)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      employee_name = VALUES(employee_name),
      employee_initials = VALUES(employee_initials),
      qualification_id = VALUES(qualification_id),
      employee_updated_at = CURRENT_TIMESTAMP
  `;

  await connection.execute(query, [
    employeeId,
    employeeName,
    employeeInitials,
    qualificationId,
  ]);
}
