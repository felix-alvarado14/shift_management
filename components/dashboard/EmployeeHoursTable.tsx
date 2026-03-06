'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import EmployeeDetailPanel from './EmployeeDetailPanel';

interface EmployeeHoursData {
  employee_id: string;
  employee_name: string;
  employee_initials: string;
  operational_hours: number;
  non_operational_hours: number;
  effective_work_hours: number;
  qualification_id: string;
}

interface EmployeeHoursTableProps {
  loadId: number;
}

export default function EmployeeHoursTable({ loadId }: EmployeeHoursTableProps) {
  const [data, setData] = useState<EmployeeHoursData[]>([]);
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
        const response = await fetch(`/api/dashboard/${loadId}/employee-hours`);
        const json = await response.json();

        if (!json.success) {
          throw new Error(json.message || 'Failed to fetch data');
        }

        setData(json.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadId]);

  // Filter data by selected positions
  const filteredData = useMemo(() => {
    return data.filter((row) => selectedPositions.has(row.qualification_id));
  }, [data, selectedPositions]);

  // Define columns
  const columns = useMemo<ColumnDef<EmployeeHoursData>[]>(
    () => [
      {
        accessorKey: 'employee_id',
        header: 'Employee ID',
        cell: (info) => (
          <button
            onClick={() => setSelectedEmployee(String(info.getValue()))}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {String(info.getValue())}
          </button>
        ),
        size: 100,
      },
      {
        accessorKey: 'employee_name',
        header: 'Name',
        cell: (info) => (
          <div className="text-gray-700">
            {String(info.getValue())}
          </div>
        ),
        size: 150,
      },
      {
        accessorKey: 'employee_initials',
        header: 'Initials',
        cell: (info) => (
          <div className="text-center text-gray-700">
            {String(info.getValue())}
          </div>
        ),
        size: 80,
      },
      {
        accessorKey: 'operational_hours',
        header: 'Operational Hours',
        cell: (info) => {
          const value = Number(info.getValue());
          return (
            <div className="text-center text-gray-700">
              {value.toFixed(2)}
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'non_operational_hours',
        header: 'Non-Operational Hours',
        cell: (info) => {
          const value = Number(info.getValue());
          return (
            <div className="text-center text-gray-700">
              {value.toFixed(2)}
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'effective_work_hours',
        header: 'Effective Work Hours',
        cell: (info) => {
          const value = Number(info.getValue());
          return (
            <div className="text-center font-semibold text-gray-900">
              {value.toFixed(2)}
            </div>
          );
        },
        size: 140,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading employee hours...</div>
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
        Employee Hours Summary
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

      {filteredData.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-6 text-center text-gray-600">
          No employee data available
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
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
        <EmployeeDetailPanel
          loadId={loadId}
          employeeId={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
