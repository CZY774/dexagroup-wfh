import { ReactNode } from 'react';

export type DataTableColumn<TData> = {
  header: string;
  render: (row: TData) => ReactNode;
  className?: string;
};

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  keyExtractor: (row: TData) => string;
  emptyText: string;
  loading?: boolean;
  skeletonRows?: number;
};

export function DataTable<TData>({
  columns,
  data,
  keyExtractor,
  emptyText,
  loading = false,
  skeletonRows = 5,
}: DataTableProps<TData>) {
  return (
    <div className="table-wrap">
      <table className="data-table" aria-busy={loading}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {columns.map((column, columnIndex) => (
                  <td key={`${column.header}-${columnIndex}`} className={column.className}>
                    <span className="skeleton-line" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)}>
                {columns.map((column) => (
                  <td key={column.header} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
