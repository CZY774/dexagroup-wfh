import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { LocationLink } from '../components/LocationLink';
import { PaginationControls } from '../components/PaginationControls';
import { ProofPreviewDialog } from '../components/ProofPreviewDialog';
import { api } from '../lib/api';
import { formatBytes, formatDate, formatDateTime } from '../lib/format';
import type { AttendanceSummary, PaginationMeta } from '../types/api';

const initialMeta: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export function EmployeeHistoryPage() {
  const [records, setRecords] = useState<AttendanceSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewProofId, setPreviewProofId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listMyAttendance({ page, limit: pageSize })
      .then((result) => {
        setRecords(result.data);
        setMeta(result.meta);
      })
      .catch((historyError) => setError(historyError instanceof Error ? historyError.message : 'Unable to load attendance history.'))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  function previewProof(id: string) {
    setError(null);
    setPreviewProofId(id);
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>Attendance History</h1>
          <p>{loading ? 'Loading records' : `${meta.total} records`}</p>
        </div>
      </div>

      {error && <div className="alert is-error" role="alert">{error}</div>}

      <DataTable
        data={records}
        keyExtractor={(record) => record.id}
        emptyText="No attendance records"
        loading={loading}
        columns={[
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
            render: (record) => (
              <span>
                {record.originalFilename} ({formatBytes(record.fileSize)})
              </span>
            ),
          },
          {
            header: 'Notes',
            render: (record) => record.notes || '-',
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
        disabled={loading}
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
