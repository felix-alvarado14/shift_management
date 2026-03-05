import pool from '@/lib/db';
import StaffingMatrixTable from '@/components/dashboard/StaffingMatrixTable';

interface LoadInfo {
  load_id: number;
  load_file_name: string;
  load_year: number;
  load_month: number;
  load_type: 'P' | 'R';
  load_created_at: string;
}

interface DashboardPageProps {
  params: Promise<{ loadId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  params,
}: DashboardPageProps) {
  const resolvedParams = await params;
  const loadId = parseInt(resolvedParams.loadId);

  if (isNaN(loadId)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Invalid Load ID</h1>
      </div>
    );
  }

  // Fetch load information
  let loadInfo: LoadInfo | null = null;
  let error: string | null = null;

  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT load_id, load_file_name, load_year, load_month, load_type, load_created_at FROM loads WHERE load_id = ?',
        [loadId]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        loadInfo = rows[0] as LoadInfo;
      } else {
        error = 'Load not found';
      }
    } finally {
      await connection.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error = `Failed to fetch load: ${message}`;
  }

  if (error || !loadInfo) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-gray-600">{error || 'Load not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard for Load {loadInfo.load_id}
          </h1>
          <p className="mt-2 text-gray-600">{loadInfo.load_file_name}</p>
        </div>

        {/* Load Info Card */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Period</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {loadInfo.load_month}/{loadInfo.load_year}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Type</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {loadInfo.load_type === 'P' ? 'Planned' : 'Real'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {new Date(loadInfo.load_created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Load ID</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                #{loadInfo.load_id}
              </p>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="space-y-8">
          {/* Operational Shifts Table */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <StaffingMatrixTable
              loadId={loadInfo.load_id}
              year={loadInfo.load_year}
              month={loadInfo.load_month}
              title="Operational Shifts Staffing Matrix"
              endpoint="operational-staffing-matrix"
            />
          </div>

          {/* Non-Operational Shifts Table */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <StaffingMatrixTable
              loadId={loadInfo.load_id}
              year={loadInfo.load_year}
              month={loadInfo.load_month}
              title="Non-Operational Shifts Staffing Matrix (e.g., Holiday, Leave)"
              endpoint="non-operational-staffing-matrix"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
