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
  showPositionFilters?: boolean;
  isOperational?: boolean;
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
  showPositionFilters = false,
  isOperational = true,
}: StaffingMatrixTableProps) {
  const [data, setData] = useState<ShiftStaffingMatrixData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(
    new Set(['S', 'E', 'P', 'R'])
  );

  // Helper function to extract position from shift code
  const extractPosition = (shiftCode: string): string => {
    if (shiftCode.length >= 2) {
      return shiftCode[1]; // Position is second character
    }
    return '';
  };

  // Helper function to toggle position filter
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
        let url = `/api/dashboard/${loadId}/${endpoint}`;
        
        // Add position filter parameters if applicable
        if (showPositionFilters && selectedPositions.size > 0) {
          const positions = Array.from(selectedPositions).join(',');
          url += `?positions=${positions}`;
        }
        
        const response = await fetch(url);
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
  }, [loadId, endpoint, showPositionFilters, selectedPositions]);

  // Determine number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build table data
  const tableData = useMemo<TableRow[]>(() => {
    let filteredData = data;
    
    // Only apply client-side position filtering if showPositionFilters is enabled
    // Note: For operational matrix, server-side filtering is primary, this is a safeguard
    if (showPositionFilters) {
      filteredData = data.filter((row) => {
        // AC shifts are already filtered server-side, keep them
        if (row.shift_code === 'AC') {
          return true;
        }
        // For other shifts, check position
        const position = extractPosition(row.shift_code);
        return selectedPositions.has(position);
      });
    }
    
    return filteredData.map((row) => {
      const tableRow: TableRow = { shift_code: row.shift_code };
      for (let day = 1; day <= daysInMonth; day++) {
        tableRow[`day_${day}`] = row.days[String(day)] || 0;
      }
      return tableRow;
    });
  }, [data, daysInMonth, selectedPositions, showPositionFilters]);

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
          const row = info.row.original;
          const isACRow = row.shift_code === 'AC';
          const isDShift = row.shift_code.startsWith('D');
          const isACWithStaff = isOperational && isACRow && value > 0;
          const shouldHighlightZero = isOperational && !isDShift && !isACRow && value === 0;
          
          return (
            <div className={`text-center font-medium ${
              isACWithStaff
                ? 'bg-red-300 text-red-900 px-2 py-1 rounded'
                : shouldHighlightZero
                ? 'bg-red-300 text-red-900 px-2 py-1 rounded'
                : 'text-gray-700'
            }`}>
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {showPositionFilters && (
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
        )}
      </div>
      
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
              {table.getRowModel().rows.map((row, idx) => {
                const isACRow = isOperational && row.original.shift_code === 'AC';
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-200 transition-colors ${
                      isACRow 
                        ? 'bg-amber-50 hover:bg-amber-100 font-semibold' 
                        : `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 text-sm ${isACRow ? 'text-amber-900' : ''}`}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
