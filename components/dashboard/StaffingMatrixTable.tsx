'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

interface ShiftStaffingMatrixData {
  shift_code: string;
  days: Record<string, number>;
}

interface StaffingMatrixTableProps {
  loadId: number;
  year: number;
  month: number;
  title: string;
  endpoint: string;
}

interface TableRow {
  shift_code: string;
  [key: string]: string | number;
}

export default function StaffingMatrixTable({
  loadId,
  year,
  month,
  title,
  endpoint,
}: StaffingMatrixTableProps) {
  const [data, setData] = useState<ShiftStaffingMatrixData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/dashboard/${loadId}/${endpoint}`);
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
  }, [loadId, endpoint]);

  // Determine number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build table data
  const tableData = useMemo<TableRow[]>(() => {
    return data.map((row) => {
      const tableRow: TableRow = { shift_code: row.shift_code };
      for (let day = 1; day <= daysInMonth; day++) {
        tableRow[`day_${day}`] = row.days[String(day)] || 0;
      }
      return tableRow;
    });
  }, [data, daysInMonth]);

  // Build columns dynamically
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    const cols: ColumnDef<TableRow>[] = [
      {
        accessorKey: 'shift_code',
        header: 'Shift',
        cell: (info) => (
          <div className="font-semibold text-gray-900">
            {String(info.getValue())}
          </div>
        ),
        size: 100,
      },
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      cols.push({
        accessorKey: `day_${day}`,
        header: String(day),
        cell: (info) => {
          const value = Number(info.getValue());
          return (
            <div className="text-center text-gray-700">
              {value > 0 ? value : '-'}
            </div>
          );
        },
        size: 50,
      });
    }

    return cols;
  }, [daysInMonth]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading {title}...</div>
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
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      
      {tableData.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-6 text-center text-gray-600">
          No staffing data available
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
    </div>
  );
}
