import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../types/api';

type PaginationControlsProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function PaginationControls({ meta, onPageChange, onLimitChange, disabled = false }: PaginationControlsProps) {
  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const lastItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        {firstItem}-{lastItem} of {meta.total}
      </span>

      <div className="pagination-actions">
        <select
          aria-label="Rows per page"
          value={meta.limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          disabled={disabled}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} rows
            </option>
          ))}
        </select>

        <button
          className="icon-button"
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={disabled || meta.page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="pagination-page">
          {meta.page} / {meta.totalPages}
        </span>

        <button
          className="icon-button"
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={disabled || meta.page >= meta.totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
