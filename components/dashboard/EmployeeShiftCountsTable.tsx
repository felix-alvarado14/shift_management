'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import EmployeeDetailShiftsModal from './EmployeeDetailShiftsModal';

interface ShiftCountsData {
  employee_id: string;
  employee_name: string;
  shift_code: string;
  shift_count: number;
  qualification_id: string;
}

interface EmployeeShiftCountsTableProps {
  loadId: number;
}

interface PivotedRow {
  employee_id: string;
  employee_name: string;
  [key: string]: string | number;
}

export default function EmployeeShiftCountsTable({
  loadId,
}: EmployeeShiftCountsTableProps) {
  const [rawData, setRawData] = useState<ShiftCountsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(
    new Set(['S', 'E', 'P', 'R'])
  );

  const togglePosition = (position: string) => {
    const newPositions = new Set(selectedPositions);
    if (newPositions.has(position)) {
      newPositions.delete(position);
    } else {
      newPositions.add(position);
    }
    setSelectedPositions(newPositions);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/${loadId}/employee-shift-counts`
        );
        const json = await response.json();

        if (!json.success) {
          throw new Error(json.message || 'Failed to fetch data');
        }

        setRawData(json.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadId]);

  // Define shift order mapping to match SQL CASE statement
  const shiftOrderMap: Record<string, number> = {
    // SUPERVISION
    'AS': 1, 'BS': 2, 'CS': 3,
    // EXECUTIVE
    'AE1': 4, 'AE2': 5, 'AE3': 6, 'AE4': 7,
    'BE1': 8, 'BE2': 9, 'BE3': 10, 'BE4': 11,
    'DE': 12, 'CE1': 13, 'CE2': 14,
    // PLANNER
    'AP1': 15, 'AP2': 16, 'AP3': 17, 'AP4': 18,
    'BP1': 19, 'BP2': 20, 'BP3': 21, 'BP4': 22,
    'DP': 23, 'CP1': 24, 'CP2': 25,
    // RADIO
    'AR': 26, 'BR': 27, 'DR': 28, 'CR': 29,
  };

  // Pivot data into matrix structure
  const pivotedData = useMemo<{
    tableData: PivotedRow[];
    allShifts: string[];
  }>(() => {
    // Filter raw data by selected positions first
    const filteredRawData = rawData.filter((row) =>
      selectedPositions.has(row.qualification_id)
    );

    const employeeMap = new Map<string, { name: string; shifts: Record<string, number> }>();
    const shiftsSet = new Set<string>(); // Track unique shifts

    // Build pivot table
    filteredRawData.forEach((row) => {
      // Skip empty shift codes
      if (!row.shift_code || row.shift_code.trim() === '') {
        return;
      }
      if (!employeeMap.has(row.employee_id)) {
        employeeMap.set(row.employee_id, { name: row.employee_name, shifts: {} });
      }
      employeeMap.get(row.employee_id)!.shifts[row.shift_code] =
        row.shift_count;
      shiftsSet.add(row.shift_code);
    });

    // Convert to table data and sort by employee_id numerically
    const tableData: PivotedRow[] = Array.from(employeeMap.entries())
      .map(([employee_id, data]) => ({
        employee_id,
        employee_name: data.name,
        ...data.shifts,
      }))
      .sort((a, b) => {
        const aNum = parseInt(String(a.employee_id), 10);
        const bNum = parseInt(String(b.employee_id), 10);
        return aNum - bNum;
      });

    // Sort shifts based on predefined order
    const allShifts = Array.from(shiftsSet).sort((a, b) => {
      const orderA = shiftOrderMap[a] ?? 999;
      const orderB = shiftOrderMap[b] ?? 999;
      return orderA - orderB;
    });

    return { tableData, allShifts };
  }, [rawData, selectedPositions]);

  // Define columns dynamically
  const columns = useMemo<ColumnDef<PivotedRow>[]>(() => {
    const cols: ColumnDef<PivotedRow>[] = [
      {
        accessorKey: 'employee_id',
        id: 'employee_id',
        header: 'ID',
        cell: (info) => (
          <button
            onClick={() => setSelectedEmployee(String(info.getValue()))}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {String(info.getValue())}
          </button>
        ),
        size: 80,
      },
      {
        accessorKey: 'employee_name',
        id: 'employee_name',
        header: 'Name',
        cell: (info) => (
          <div className="font-semibold text-gray-900">
            {String(info.getValue())}
          </div>
        ),
        size: 150,
      },
    ];

    // Add a column for each shift
    pivotedData.allShifts.forEach((shift) => {
      cols.push({
        accessorKey: shift,
        id: `shift_${shift}`,
        header: shift,
        cell: (info) => {
          const value = Number(info.getValue()) || 0;
          return (
            <div className="text-center text-gray-700">
              {value > 0 ? value : '-'}
            </div>
          );
        },
        size: 60,
      });
    });

    return cols;
  }, [pivotedData.allShifts]);

  const table = useReactTable({
    data: pivotedData.tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">
          Loading employee shift counts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-red-800">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">
        Employee Shift Counts Matrix
      </h2>

      <div className="flex gap-2">
        {[
          { position: 'S', label: 'Supervisors' },
          { position: 'E', label: 'Executives' },
          { position: 'P', label: 'Planners' },
          { position: 'R', label: 'Radios' },
        ].map(({ position, label }) => (
          <button
            key={position}
            onClick={() => togglePosition(position)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPositions.has(position)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pivotedData.tableData.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-6 text-center text-gray-600">
          No shift data available
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-gray-200"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-700"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-200 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailShiftsModal
          loadId={loadId}
          employeeId={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
