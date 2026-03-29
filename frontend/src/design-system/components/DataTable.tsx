import type { ReactNode } from 'react';

type DataTableProps = {
  columns: string[];
  rows: Array<Array<ReactNode>>;
  compact?: boolean;
};

export function DataTable({ columns, rows, compact = false }: DataTableProps) {
  return (
    <div className="ds-table-wrap">
      <table className={compact ? 'table compact-table ds-table' : 'table ds-table'}>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
