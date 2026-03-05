'use client';

import { useEffect, useState } from 'react';

interface ShiftStaffingMatrixData {
  shift_code: string;
  days: Record<string, number>;
}

interface ShiftStaffingMatrixProps {
  loadId: number;
  year: number;
  month: number;
}

export default function ShiftStaffingMatrix({
  loadId,
  year,
  month,
}: ShiftStaffingMatrixProps) {
  const [data, setData] = useState<ShiftStaffingMatrixData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/${loadId}/shift-staffing-matrix`
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
  }, [loadId]);

  // Determine number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  if (loading) {
    return <div>Loading shift staffing matrix...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <h2>Shift Staffing Matrix</h2>
      <table
        style={{
          borderCollapse: 'collapse',
          border: '1px solid #ddd',
          width: '100%',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th
              style={{
                border: '1px solid #ddd',
                padding: '8px',
                textAlign: 'left',
              }}
            >
              Shift Code
            </th>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <th
                key={day}
                style={{
                  border: '1px solid #ddd',
                  padding: '8px',
                  textAlign: 'center',
                  minWidth: '40px',
                }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={daysInMonth + 1}
                style={{
                  border: '1px solid #ddd',
                  padding: '8px',
                  textAlign: 'center',
                }}
              >
                No staffing data available
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.shift_code}>
                <td
                  style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                    fontWeight: 'bold',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  {row.shift_code}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => (
                    <td
                      key={day}
                      style={{
                        border: '1px solid #ddd',
                        padding: '8px',
                        textAlign: 'center',
                        backgroundColor: row.days[String(day)]
                          ? '#fff'
                          : '#f9f9f9',
                      }}
                    >
                      {row.days[String(day)] || 0}
                    </td>
                  )
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
