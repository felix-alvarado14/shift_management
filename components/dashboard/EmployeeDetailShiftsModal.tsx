'use client';

import { useEffect, useState } from 'react';

interface ShiftCount {
  shift_code: string;
  shift_count: number;
}

interface EmployeeDetailShifts {
  employee_id: string;
  employee_name: string;
  shifts: ShiftCount[];
}

interface EmployeeDetailShiftsModalProps {
  loadId: number;
  employeeId: string;
  onClose: () => void;
}

export default function EmployeeDetailShiftsModal({
  loadId,
  employeeId,
  onClose,
}: EmployeeDetailShiftsModalProps) {
  const [data, setData] = useState<EmployeeDetailShifts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/dashboard/${loadId}/employee-detail-shifts/${employeeId}`
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch employee shifts: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadId, employeeId]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-gray-600">Loading shifts...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {data.employee_name} ({data.employee_id}) - Shifts Covered
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {data.shifts.length === 0 ? (
            <p className="text-gray-600">No shifts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Shift Code
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.shifts.map((shift, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                        {shift.shift_code}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-700">
                        {shift.shift_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
