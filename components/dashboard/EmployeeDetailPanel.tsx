'use client';

import { useEffect, useState } from 'react';

interface NonOperationalActivity {
  code: string;
  count: number;
}

interface ShiftCount {
  shift: string;
  count: number;
}

interface OperationalHours {
  shift: string;
  hours: number;
}

interface NonOperationalHours {
  code: string;
  hours: number;
}

interface EmployeeDetail {
  employee_id: string;
  employee_name: string;
  non_operational_activities: NonOperationalActivity[];
  shift_counts: ShiftCount[];
  operational_hours: OperationalHours[];
  non_operational_hours: NonOperationalHours[];
}

interface EmployeeDetailPanelProps {
  loadId: number;
  employeeId: string;
  onClose: () => void;
}

export default function EmployeeDetailPanel({
  loadId,
  employeeId,
  onClose,
}: EmployeeDetailPanelProps) {
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/${loadId}/employee-detail/${employeeId}`
        );
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
  }, [loadId, employeeId]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-gray-600">Loading employee details...</div>
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
          className="w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 shadow-lg"
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {data.employee_name} ({data.employee_id}) - Detailed Breakdown
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Non Operational Activities */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Non-Operational Activities
            </h4>
            {data.non_operational_activities.length === 0 ? (
              <p className="text-gray-600">No non-operational activities</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Code
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.non_operational_activities.map((item, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                          {item.code}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-700">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Number of Shifts */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Number of Shifts
            </h4>
            {data.shift_counts.length === 0 ? (
              <p className="text-gray-600">No shift data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Shift Type
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shift_counts.map((item, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                          {item.shift}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-700">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Operational Hours by Shift */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Operational Hours by Shift
            </h4>
            {data.operational_hours.length === 0 ? (
              <p className="text-gray-600">No operational hours data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Shift Type
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                        Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operational_hours.map((item, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                          {item.shift}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-700">
                          {item.hours.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Non-Operational Hours */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Non-Operational Hours
            </h4>
            {data.non_operational_hours.length === 0 ? (
              <p className="text-gray-600">No non-operational hours</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Code
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                        Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.non_operational_hours.map((item, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                          {item.code}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-700">
                          {item.hours.toFixed(2)}
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
    </div>
  );
}
