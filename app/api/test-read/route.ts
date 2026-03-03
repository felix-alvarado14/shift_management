import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { Buffer } from "buffer";

interface EmployeeData {
  employee_id: string;
  employee_initials: string;
  employee_name: string;
  days: Record<string, string>;
}

export async function POST(request: Request) {
  const tempPath = join(tmpdir(), `excel-${Date.now()}.xlsx`);
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Write file to temp location
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempPath, buffer);

    // Load workbook from temp file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tempPath);

    // Get first worksheet
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      await unlink(tempPath);
      return NextResponse.json(
        { success: false, message: "No worksheet found" },
        { status: 400 }
      );
    }

    const employees: EmployeeData[] = [];

    // Process each row
    worksheet.eachRow((row, rowNumber) => {
      // Skip header row (row 1)
      if (rowNumber === 1) return;

      // Get first cell value (employee ID)
      const firstCell = row.getCell(1);
      const employeeIdValue = String(firstCell.value || "").trim();

      // Check if first cell is numeric
      if (!employeeIdValue || isNaN(Number(employeeIdValue))) {
        // Skip non-numeric rows
        return;
      }

      // Extract employee data
      const employee_id = employeeIdValue;
      const employee_initials = String(row.getCell(2).value || "").trim();
      const employee_name = String(row.getCell(3).value || "").trim();

      // Process day columns (starting from column 4)
      const days: Record<string, string> = {};
      
      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        const dayCell = row.getCell(dayNum + 3); // Column 4 onwards
        const dayValue = String(dayCell.value || "").trim();

        // Only include non-empty day values
        if (dayValue) {
          days[String(dayNum)] = dayValue;
        }
      }

      // Add employee to results
      employees.push({
        employee_id,
        employee_initials,
        employee_name,
        days,
      });
    });

    // Clean up temp file
    await unlink(tempPath);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheetName: worksheet.name,
      employeeCount: employees.length,
      data: employees,
    });
  } catch (error) {
    // Clean up on error
    try {
      await unlink(tempPath);
    } catch {}
    
    console.error("Error reading Excel file:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error reading file", 
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}