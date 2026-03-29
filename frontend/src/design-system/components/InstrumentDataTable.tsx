import { ReactNode, useState } from 'react';

export type InstrumentTableRow = {
  id: string;
  icon: string;
  name: string;
  category: string;
  status: { tone: 'green' | 'amber'; label: string };
  date: string;
  actions: number[];
  actionContent?: ReactNode;
  nested?: boolean;
  children?: InstrumentTableRow[];
};

type InstrumentDataTableProps = {
  title?: string;
  rows: InstrumentTableRow[];
  selectable?: boolean;
  defaultExpandedParents?: string[];
  defaultSortKey?: 'name' | 'category' | 'status' | 'date';
  defaultSortDir?: 'asc' | 'desc';
  pageSize?: number;
  selectedRowId?: string | null;
  onRowClick?: (row: InstrumentTableRow) => void;
  columnWidths?: {
    name?: string;
    category?: string;
    status?: string;
    date?: string;
    actions?: string;
  };
};

export function InstrumentDataTable({
  title = 'Data Table',
  rows,
  selectable: selectableDefault = true,
  defaultExpandedParents = [],
  defaultSortKey = 'date',
  defaultSortDir = 'asc',
  pageSize = 3,
  selectedRowId = null,
  onRowClick,
  columnWidths,
}: InstrumentDataTableProps) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'category' | 'status' | 'date'>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = useState(1);
  const [selectable, setSelectable] = useState(selectableDefault);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedParents, setExpandedParents] = useState<string[]>(defaultExpandedParents);

  const headerColumns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'category' as const, label: 'Category' },
    { key: 'status' as const, label: 'Status' },
    { key: 'date' as const, label: 'Date' },
    { key: 'actions' as const, label: 'Actions' },
  ];

  const statusDot = (tone: 'green' | 'amber') => ({
    width: 12,
    height: 12,
    borderRadius: 999,
    display: 'inline-block',
    background: tone === 'green' ? 'radial-gradient(circle at 35% 35%, #d6ffd9 0%, #b2efb2 28%, #73bd73 62%, #487348 100%)' : 'radial-gradient(circle at 35% 35%, #ffe6bf 0%, #ffc97a 28%, #d98c39 62%, #7a4b19 100%)',
    boxShadow: tone === 'green' ? '0 0 10px rgba(143, 232, 143, 0.2)' : '0 0 10px rgba(255, 188, 91, 0.2)',
  });

  const filtered = rows.filter((row) => {
    const query = filter.trim().toLowerCase();
    if (!query) return true;
    return [row.name, row.category, row.status.label, row.date].join(' ').toLowerCase().includes(query);
  });

  const sorted = [...filtered].sort((a, b) => {
    const value = (row: InstrumentTableRow) => {
      if (sortKey === 'name') return row.name;
      if (sortKey === 'category') return row.category;
      if (sortKey === 'status') return row.status.label;
      return row.date;
    };
    return sortDir === 'asc' ? value(a).localeCompare(value(b)) : value(b).localeCompare(value(a));
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleRows = pageRows.flatMap((row) => expandedParents.includes(row.id) && row.children ? [row, ...row.children] : [row]);

  const toggleSort = (key: 'name' | 'category' | 'status' | 'date') => {
    if (sortKey === key) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedParents((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const allVisibleBaseIds = pageRows.map((row) => row.id);
  const allSelected = allVisibleBaseIds.length > 0 && allVisibleBaseIds.every((id) => selectedIds.includes(id));
  const resolvedWidths = {
    name: columnWidths?.name ?? 'minmax(0, 1.45fr)',
    category: columnWidths?.category ?? 'minmax(0, 1fr)',
    status: columnWidths?.status ?? 'minmax(0, 1fr)',
    date: columnWidths?.date ?? 'minmax(0, 1fr)',
    actions: columnWidths?.actions ?? 'minmax(0, 1fr)',
  };
  const hasExpandableRows = visibleRows.some((row) => row.children?.length);
  const trailingColumn = hasExpandableRows ? '34px' : '0px';
  const columnTemplate = `${selectable ? '34px ' : ''}46px ${resolvedWidths.name} ${resolvedWidths.category} ${resolvedWidths.status} ${resolvedWidths.date} ${resolvedWidths.actions} ${trailingColumn}`;

  return (
    <div
      role="group"
      aria-label="Instrument data table"
      style={{
        position: 'relative',
        width: '100%',
        border: '1px solid rgba(178, 214, 232, 0.24)',
        borderRadius: 2,
        background: 'linear-gradient(180deg, #253947 0%, #192831 38%, #162831 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 22px rgba(194,232,247,0.04)',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 16%, rgba(163,185,192,0.08), transparent 22%), radial-gradient(circle at 72% 44%, rgba(147,162,172,0.06), transparent 28%), radial-gradient(circle at 52% 62%, rgba(99,142,157,0.045), transparent 30%), linear-gradient(180deg, rgba(171,193,198,0.035), transparent 22%, transparent 72%, rgba(156,198,216,0.025))', pointerEvents: 'none' }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 7, left: 10, right: 10, height: 1, background: 'linear-gradient(90deg, rgba(233,247,255,0.08), rgba(248,252,255,0.92) 18%, rgba(224,239,246,0.18) 48%, rgba(233,247,255,0.08))' }} />
      <div style={{ padding: '16px 18px 10px', display: 'grid', gap: 12, background: 'radial-gradient(circle at 10% 24%, rgba(171,193,198,0.012), transparent 4%), radial-gradient(circle at 18% 56%, rgba(156,198,216,0.011), transparent 4%), radial-gradient(circle at 28% 34%, rgba(143,151,157,0.01), transparent 4%), radial-gradient(circle at 38% 68%, rgba(192,212,212,0.01), transparent 4%), radial-gradient(circle at 48% 42%, rgba(171,193,198,0.011), transparent 4%), radial-gradient(circle at 58% 26%, rgba(156,198,216,0.01), transparent 4%), radial-gradient(circle at 68% 62%, rgba(143,151,157,0.01), transparent 4%), radial-gradient(circle at 78% 38%, rgba(192,212,212,0.01), transparent 4%), radial-gradient(circle at 88% 58%, rgba(171,193,198,0.011), transparent 4%), #18232B', boxShadow: 'inset 0 1px 0 rgba(192,212,212,0.03), inset 0 -1px 0 rgba(117,128,136,0.08), 0 0 6px rgba(156,198,216,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: '"IBM Plex Sans", Inter, "Segoe UI", Arial, sans-serif', fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', color: '#bccbd3', lineHeight: 1, textShadow: '0 0 3px rgba(171,193,198,0.03)' }}>{title}</div>
          <span aria-hidden="true" style={{ height: 1, background: 'linear-gradient(90deg, rgba(156,198,216,0.92), rgba(156,198,216,0.34) 22%, rgba(171,193,198,0.12) 52%, transparent)', boxShadow: '0 0 6px rgba(156,198,216,0.18)' }} />
          <input value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} placeholder="Filter..." style={{ minWidth: 120, height: 28, border: '1px solid rgba(156,198,216,0.18)', borderRadius: 0, background: 'radial-gradient(circle at 18% 28%, rgba(171,193,198,0.012), transparent 4%), radial-gradient(circle at 44% 62%, rgba(156,198,216,0.011), transparent 4%), radial-gradient(circle at 76% 40%, rgba(192,212,212,0.01), transparent 4%), rgba(39, 53, 63, 0.76)', color: '#d6e3eb', padding: '0 10px', outline: 'none', boxShadow: 'inset 0 1px 0 rgba(192,212,212,0.03)' }} />
          <button type="button" onClick={() => setSelectable((value) => !value)} style={{ minHeight: 28, padding: '0 10px', border: '1px solid rgba(156,198,216,0.18)', borderRadius: 0, background: selectable ? 'radial-gradient(circle at 18% 28%, rgba(171,193,198,0.014), transparent 4%), radial-gradient(circle at 44% 62%, rgba(156,198,216,0.012), transparent 4%), radial-gradient(circle at 76% 40%, rgba(192,212,212,0.011), transparent 4%), rgba(68, 84, 94, 0.82)' : 'radial-gradient(circle at 18% 28%, rgba(171,193,198,0.012), transparent 4%), radial-gradient(circle at 44% 62%, rgba(156,198,216,0.011), transparent 4%), radial-gradient(circle at 76% 40%, rgba(192,212,212,0.01), transparent 4%), rgba(39, 53, 63, 0.76)', color: '#d6e3eb', boxShadow: selectable ? '0 0 6px rgba(156,198,216,0.035)' : 'none' }}>Select</button>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(156,198,216,0.12)', borderBottom: '1px solid rgba(156,198,216,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: columnTemplate, minHeight: 34, background: 'radial-gradient(circle at 10% 26%, rgba(159,187,200,0.012), transparent 4%), radial-gradient(circle at 24% 62%, rgba(143,151,157,0.011), transparent 4%), radial-gradient(circle at 38% 34%, rgba(171,193,198,0.01), transparent 4%), radial-gradient(circle at 52% 66%, rgba(192,212,212,0.01), transparent 4%), radial-gradient(circle at 66% 30%, rgba(159,187,200,0.011), transparent 4%), radial-gradient(circle at 80% 58%, rgba(143,151,157,0.01), transparent 4%), #18232B', boxShadow: 'inset 0 1px 0 rgba(192,212,212,0.03), inset 0 -1px 0 rgba(117,128,136,0.08), 0 0 6px rgba(156,198,216,0.02)' }}>
          {selectable ? (
            <button type="button" onClick={() => setSelectedIds(allSelected ? selectedIds.filter((id) => !allVisibleBaseIds.includes(id)) : [...new Set([...selectedIds, ...allVisibleBaseIds])])} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: 0, borderRight: '1px solid rgba(156,198,216,0.16)', background: 'transparent', color: '#abc1c6', appearance: 'none' }}>{allSelected ? '☑' : '☐'}</button>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(156,198,216,0.16)', color: '#abc1c6', fontSize: 13, fontWeight: 700 }}>ID</div>
          {headerColumns.map((column) => (
            <button key={column.key} type="button" onClick={() => column.key !== 'actions' && toggleSort(column.key as 'name' | 'category' | 'status' | 'date')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', border: 0, borderRadius: 0, borderRight: '1px solid rgba(156,198,216,0.16)', background: 'transparent', color: '#b8cbd3', fontSize: 13, fontWeight: 600, textTransform: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.01)' }}>
              <span>{column.label}</span>
              {column.key !== 'actions' ? <span style={{ opacity: sortKey === column.key ? 1 : 0.45 }}>{sortKey === column.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span> : null}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8ea5b6', opacity: hasExpandableRows ? 1 : 0 }}>{hasExpandableRows ? '⌄' : ''}</div>
        </div>
        {visibleRows.map((row) => {
          const isParent = !row.nested;
          const isExpandedParent = isParent && expandedParents.includes(row.id);
          const isSelectedRow = selectedRowId === row.id || selectedIds.includes(row.id);
          return (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row)}
              style={{
                display: 'grid',
                gridTemplateColumns: columnTemplate,
                minHeight: row.nested ? 38 : 42,
                borderTop: '1px solid rgba(170, 205, 222, 0.16)',
                background: isSelectedRow ? 'radial-gradient(circle at 12% 26%, rgba(159,187,200,0.018), transparent 4%), radial-gradient(circle at 28% 62%, rgba(156,198,216,0.016), transparent 4%), radial-gradient(circle at 46% 34%, rgba(143,151,157,0.015), transparent 4%), radial-gradient(circle at 64% 66%, rgba(192,212,212,0.014), transparent 4%), radial-gradient(circle at 82% 38%, rgba(159,187,200,0.016), transparent 4%), rgba(44, 61, 72, 0.94)' : row.nested ? 'radial-gradient(circle at 14% 28%, rgba(159,187,200,0.008), transparent 4%), radial-gradient(circle at 38% 64%, rgba(143,151,157,0.007), transparent 4%), radial-gradient(circle at 74% 36%, rgba(171,193,198,0.007), transparent 4%), rgba(29, 40, 48, 0.9)' : isExpandedParent ? 'radial-gradient(circle at 12% 28%, rgba(159,187,200,0.012), transparent 4%), radial-gradient(circle at 34% 62%, rgba(143,151,157,0.011), transparent 4%), radial-gradient(circle at 72% 38%, rgba(171,193,198,0.01), transparent 4%), rgba(40, 57, 68, 0.92)' : 'radial-gradient(circle at 12% 28%, rgba(159,187,200,0.01), transparent 4%), radial-gradient(circle at 32% 62%, rgba(143,151,157,0.009), transparent 4%), radial-gradient(circle at 52% 36%, rgba(171,193,198,0.009), transparent 4%), radial-gradient(circle at 74% 64%, rgba(192,212,212,0.008), transparent 4%), rgba(37, 58, 71, 0.92)',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              {selectable ? <button type="button" onClick={(event) => { event.stopPropagation(); toggleSelected(row.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: 0, borderRight: '1px solid rgba(117,128,136,0.22)', background: isSelectedRow ? 'radial-gradient(circle at 24% 30%, rgba(171,193,198,0.018), transparent 4%), radial-gradient(circle at 68% 62%, rgba(156,198,216,0.016), transparent 4%), rgba(86, 103, 116, 0.88)' : 'transparent', color: isSelectedRow ? '#C0D4D4' : '#87A3AD', boxShadow: isSelectedRow ? 'inset 0 0 0 1px rgba(156,198,216,0.08)' : 'none', appearance: 'none' }}>{isSelectedRow ? '☑' : '☐'}</button> : null}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(170,205,222,0.18)' }}>
                <span style={{ width: 16, height: 16, borderRadius: 0, border: '1px solid rgba(186,220,238,0.46)', background: 'linear-gradient(180deg, rgba(234,246,252,0.16) 0%, rgba(18,28,39,0.14) 100%)', color: '#eef7fd', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{row.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', minWidth: 0, overflow: 'hidden', borderRight: '1px solid rgba(156,198,216,0.14)', color: selectedIds.includes(row.id) ? '#e4f0f6' : row.nested ? '#b7c8d2' : '#d4e1e8', fontSize: 14, fontWeight: selectedIds.includes(row.id) || isExpandedParent ? 600 : 500 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: selectedIds.includes(row.id) ? 1 : row.nested ? 0.68 : isExpandedParent ? 0.9 : 0.82 }}>{row.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', minWidth: 0, overflow: 'hidden', borderRight: '1px solid rgba(156,198,216,0.14)', color: row.nested ? '#b7c8d2' : '#cfdde5', fontSize: 14, whiteSpace: 'nowrap', textOverflow: 'ellipsis', opacity: isSelectedRow ? 1 : undefined }}>{row.category}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', minWidth: 0, overflow: 'hidden', borderRight: '1px solid rgba(156,198,216,0.14)', color: row.nested ? '#b7c8d2' : '#cfdde5', fontSize: 14 }}>
                <span style={statusDot(row.status.tone)} />
                <span>{row.status.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', minWidth: 0, overflow: 'hidden', borderRight: '1px solid rgba(156,198,216,0.14)', color: row.nested ? '#b7c8d2' : '#cfdde5', fontSize: 14, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.date}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: hasExpandableRows ? '1px solid rgba(156,198,216,0.14)' : '0', minWidth: 0, overflow: 'hidden' }}>
                {row.actionContent ?? row.actions.map((bar, index) => <span key={index} style={{ width: bar, height: 8, background: 'linear-gradient(90deg, rgba(226,234,238,0.86), rgba(154,170,180,0.72))' }} />)}
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); if (row.children) toggleExpand(row.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', color: row.children ? '#d8e6ef' : '#617688', fontSize: 18, cursor: row.children ? 'pointer' : 'default', opacity: hasExpandableRows ? 1 : 0, pointerEvents: hasExpandableRows ? 'auto' : 'none' }}>{row.children ? (isExpandedParent ? '⌃' : '⌄') : ''}</button>
            </div>
          );
        })}
      </div>
      <div style={{ minHeight: 34, display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', gap: 8, padding: '0 12px', borderTop: '1px solid rgba(117,128,136,0.16)', background: 'radial-gradient(circle at 12% 28%, rgba(159,187,200,0.012), transparent 4%), radial-gradient(circle at 34% 64%, rgba(143,151,157,0.011), transparent 4%), radial-gradient(circle at 58% 34%, rgba(171,193,198,0.01), transparent 4%), radial-gradient(circle at 82% 60%, rgba(192,212,212,0.01), transparent 4%), rgba(47, 75, 91, 0.9)' }}>
        <div style={{ color: '#ABC1C6', fontWeight: 600 }}>Detail View</div>
        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} style={{ minWidth: 28, minHeight: 24, border: '1px solid rgba(156,198,216,0.18)', borderRadius: 0, background: 'rgba(24,35,43,0.24)', color: '#dce8ef' }}>‹</button>
        <div style={{ color: '#dce8ef', fontSize: 13 }}>Page {currentPage} / {totalPages}</div>
        <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} style={{ minWidth: 28, minHeight: 24, border: '1px solid rgba(156,198,216,0.18)', borderRadius: 0, background: 'rgba(24,35,43,0.24)', color: '#dce8ef' }}>›</button>
        <div style={{ color: '#8ea5b6', fontSize: 12 }}>{sorted.length} rows</div>
      </div>
    </div>
  );
}
