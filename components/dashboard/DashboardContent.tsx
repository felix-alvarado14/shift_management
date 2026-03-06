'use client';

import { useState } from 'react';
import StaffingMatrixTable from './StaffingMatrixTable';
import EmployeeHoursTable from './EmployeeHoursTable';
import EmployeeShiftCountsTable from './EmployeeShiftCountsTable';
import DashboardCard from './DashboardCard';
import MatrixToggleButton from './MatrixToggleButton';

interface DashboardContentProps {
  loadId: number;
  year: number;
  month: number;
}

export default function DashboardContent({
  loadId,
  year,
  month,
}: DashboardContentProps) {
  const [visibleMatrices, setVisibleMatrices] = useState({
    operational: true,
    nonOperational: true,
    employeeHours: true,
    employeeShiftCounts: true,
  });

  const toggleMatrix = (matrix: keyof typeof visibleMatrices) => {
    setVisibleMatrices((prev) => ({
      ...prev,
      [matrix]: !prev[matrix],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Toggle Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Show/Hide Matrices
        </h2>
        <div className="flex flex-wrap gap-3">
          <MatrixToggleButton
            label="Operational Staffing"
            isVisible={visibleMatrices.operational}
            onClick={() => toggleMatrix('operational')}
          />
          <MatrixToggleButton
            label="Non-Operational Staffing"
            isVisible={visibleMatrices.nonOperational}
            onClick={() => toggleMatrix('nonOperational')}
          />
          <MatrixToggleButton
            label="Employee Hours"
            isVisible={visibleMatrices.employeeHours}
            onClick={() => toggleMatrix('employeeHours')}
          />
          <MatrixToggleButton
            label="Employee Shift Counts"
            isVisible={visibleMatrices.employeeShiftCounts}
            onClick={() => toggleMatrix('employeeShiftCounts')}
          />
        </div>
      </div>

      {/* Matrices Section */}
      <div className="space-y-6">
        {/* Operational Shifts Table */}
        {visibleMatrices.operational && (
          <DashboardCard
            title="Operational Shifts Staffing Matrix"
            description="Employee coverage across different shift types (Supervision, Executive, Planner, Radio)"
          >
            <StaffingMatrixTable
              loadId={loadId}
              year={year}
              month={month}
              title="Operational Shifts Staffing Matrix"
              endpoint="operational-staffing-matrix"
              showPositionFilters={true}
              isOperational={true}
            />
          </DashboardCard>
        )}

        {/* Non-Operational Shifts Table */}
        {visibleMatrices.nonOperational && (
          <DashboardCard
            title="Non-Operational Shifts Staffing Matrix"
            description="Coverage for holidays, leave, and other non-operational activities"
          >
            <StaffingMatrixTable
              loadId={loadId}
              year={year}
              month={month}
              title="Non-Operational Shifts Staffing Matrix"
              endpoint="non-operational-staffing-matrix"
              isOperational={false}
            />
          </DashboardCard>
        )}

        {/* Employee Hours Summary Table */}
        {visibleMatrices.employeeHours && (
          <DashboardCard
            title="Employee Hours Summary"
            description="Total operational, non-operational, and effective work hours per employee"
          >
            <EmployeeHoursTable loadId={loadId} />
          </DashboardCard>
        )}

        {/* Employee Shift Counts Matrix */}
        {visibleMatrices.employeeShiftCounts && (
          <DashboardCard
            title="Employee Shift Counts"
            description="Number of shifts worked by each employee, organized by shift type"
          >
            <EmployeeShiftCountsTable loadId={loadId} />
          </DashboardCard>
        )}
      </div>
    </div>
  );
}
