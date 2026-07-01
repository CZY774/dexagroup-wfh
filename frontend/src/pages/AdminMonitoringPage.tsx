import { FormEvent, useEffect, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { LocationLink } from '../components/LocationLink';
import { PaginationControls } from '../components/PaginationControls';
import { ProofPreviewDialog } from '../components/ProofPreviewDialog';
import { api } from '../lib/api';
import { formatBytes, formatDate, formatDateTime } from '../lib/format';
import type { AttendanceWithEmployee, EmployeeSummary, PaginationMeta } from '../types/api';

const initialMeta: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export function AdminMonitoringPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
  const [date, setDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [appliedDate, setAppliedDate] = useState('');
  const [appliedEmployeeId, setAppliedEmployeeId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [previewProofId, setPreviewProofId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAttendance(page, pageSize);
  }, [page, pageSize]);

  async function loadInitialData() {
    setLoading(true);
    setError(null);

    try {
      const [employeeRows, attendanceRows] = await Promise.all([
        api.listEmployees({ page: 1, limit: 100 }),
        api.listAttendance({ page: 1, limit: pageSize }),
      ]);
      setEmployees(employeeRows.data);
      setRecords(attendanceRows.data);
      setMeta(attendanceRows.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load monitoring data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance(
    nextPage: number,
    nextLimit: number,
    filters: { date: string; employeeId: string } = { date: appliedDate, employeeId: appliedEmployeeId },
  ) {
    if (loading) {
      return;
    }

    setFiltering(true);
    setError(null);

    try {
      const result = await api.listAttendance({ date: filters.date, employeeId: filters.employeeId, page: nextPage, limit: nextLimit });
      setRecords(result.data);
      setMeta(result.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load attendance data.');
    } finally {
      setFiltering(false);
    }
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = { date, employeeId };
    setAppliedDate(date);
    setAppliedEmployeeId(employeeId);
    if (page === 1) {
      await loadAttendance(1, pageSize, nextFilters);
      return;
    }

    setPage(1);
  }

  function previewProof(id: string) {
    setError(null);
    setPreviewProofId(id);
  }

  const tableLoading = loading || filtering;

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>Attendance Monitoring</h1>
          <p>{loading ? 'Loading records' : `${meta.total} records`}</p>
        </div>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <FormField label="Date">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={tableLoading} />
        </FormField>
        <FormField label="Employee">
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={tableLoading}>
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </FormField>
        <button className="primary-button" type="submit" disabled={tableLoading}>
          <Search size={18} />
          {filtering ? 'Filtering' : 'Filter'}
        </button>
      </form>

      {error && <div className="alert is-error" role="alert">{error}</div>}

      <DataTable
        data={records}
        keyExtractor={(record) => record.id}
        emptyText="No attendance records"
        loading={tableLoading}
        columns={[
          {
            header: 'Employee',
            render: (record) => (
              <div className="entity-cell">
                <strong>{record.employee?.fullName ?? 'Unknown employee'}</strong>
                <span>{record.employee?.employeeNumber ?? record.employeeId}</span>
              </div>
            ),
          },
          {
            header: 'Date',
            render: (record) => formatDate(record.attendanceDate),
          },
          {
            header: 'Submitted',
            render: (record) => formatDateTime(record.submittedAt),
          },
          {
            header: 'File',
            render: (record) => `${record.originalFilename} (${formatBytes(record.fileSize)})`,
          },
          {
            header: 'Location',
            render: (record) => (
              <LocationLink
                latitude={record.latitude}
                longitude={record.longitude}
                accuracyMeters={record.accuracyMeters}
              />
            ),
          },
          {
            header: 'Proof',
            className: 'action-column',
            render: (record) => (
              <button
                className="icon-text-button"
                type="button"
                onClick={() => previewProof(record.id)}
                aria-haspopup="dialog"
              >
                <Eye size={16} />
                Preview
              </button>
            ),
          },
        ]}
      />

      <PaginationControls
        meta={meta}
        onPageChange={setPage}
        onLimitChange={(limit) => {
          setPageSize(limit);
          setPage(1);
        }}
        disabled={tableLoading}
      />

      {previewProofId && (
        <ProofPreviewDialog
          recordId={previewProofId}
          title="Attendance Proof"
          onClose={() => setPreviewProofId(null)}
        />
      )}
    </section>
  );
}
