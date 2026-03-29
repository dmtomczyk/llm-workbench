import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { InstrumentDataTable, type InstrumentTableRow } from './InstrumentDataTable';
import { MultiLineTextField } from './MultiLineTextField';
import { NavMenu } from './NavMenu';
import { StatusChip, type StatusChipTone } from './StatusChip';

type UsersMetricCardProps = {
  value: ReactNode;
  label?: ReactNode;
};

const shell: CSSProperties = {
  position: 'relative',
  border: '1px solid rgba(150, 190, 214, 0.22)',
  background: 'linear-gradient(180deg, rgba(18, 27, 39, 0.96) 0%, rgba(10, 16, 24, 0.98) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  overflow: 'hidden',
};

export function UsersMetricCard({ value, label = 'Users' }: UsersMetricCardProps) {
  return (
    <div
      role="group"
      aria-label="Users metric card"
      style={{
        ...shell,
        minHeight: 110,
        borderRadius: 4,
        display: 'grid',
        justifyItems: 'center',
        alignContent: 'center',
        gap: 6,
        padding: '18px 16px 16px',
      }}
    >
      <span
        aria-hidden="true"
        style={{ position: 'absolute', top: 6, left: 10, right: 10, height: 1, background: 'linear-gradient(90deg, rgba(235,248,255,0.08), rgba(242,250,255,0.85) 18%, rgba(212,231,242,0.18) 55%, rgba(235,248,255,0.08))' }}
      />
      <span
        aria-hidden="true"
        style={{ position: 'absolute', left: 8, top: '50%', width: 16, height: 1, transform: 'translateY(-50%)', background: 'linear-gradient(90deg, rgba(242,250,255,0.9), rgba(212,231,242,0.18))' }}
      />
      <span
        aria-hidden="true"
        style={{ position: 'absolute', left: 8, top: 'calc(50% - 14px)', width: 1, height: 28, background: 'linear-gradient(180deg, rgba(212,231,242,0.08), rgba(242,250,255,0.92) 50%, rgba(212,231,242,0.08))' }}
      />
      <div style={{ fontSize: 40, lineHeight: 1, fontWeight: 500, letterSpacing: '-0.04em', color: '#eef7fd' }}>{value}</div>
      <div style={{ fontSize: 18, lineHeight: 1.1, color: '#d4e2eb' }}>{label}</div>
    </div>
  );
}

export function UsersMetricCardV2({ value, label = 'Users' }: UsersMetricCardProps) {
  return (
    <div
      role="group"
      aria-label="Users metric card replica"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 118,
        borderRadius: 2,
        border: '1px solid rgba(186, 220, 238, 0.24)',
        background: 'linear-gradient(180deg, rgba(28, 40, 56, 0.99) 0%, rgba(11, 18, 28, 1) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 28px rgba(196, 234, 250, 0.06)',
        overflow: 'hidden',
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', inset: 6, border: '1px solid rgba(202, 232, 246, 0.15)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 19%, transparent 77%, rgba(198,229,243,0.03))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 8, left: 10, right: 10, height: 1, background: 'linear-gradient(90deg, rgba(233,247,255,0.12), rgba(248,252,255,1) 18%, rgba(224,239,246,0.24) 55%, rgba(233,247,255,0.1))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, right: 10, top: '58%', height: 1, background: 'linear-gradient(90deg, rgba(233,247,255,0.08), rgba(248,252,255,0.74) 22%, rgba(224,239,246,0.18) 55%, rgba(233,247,255,0.08))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, top: '58%', width: 17, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,1), rgba(224,239,246,0.14))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, top: 'calc(58% - 13px)', width: 1, height: 26, background: 'linear-gradient(180deg, rgba(224,239,246,0.08), rgba(248,252,255,1) 50%, rgba(224,239,246,0.08))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, bottom: 8, width: 12, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.94), rgba(224,239,246,0.18))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, bottom: 8, width: 1, height: 12, background: 'linear-gradient(180deg, rgba(248,252,255,0.94), rgba(224,239,246,0.18))', transform: 'translateY(-11px)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, bottom: 8, width: 12, height: 1, background: 'linear-gradient(270deg, rgba(248,252,255,0.94), rgba(224,239,246,0.18))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, bottom: 8, width: 1, height: 12, background: 'linear-gradient(180deg, rgba(248,252,255,0.94), rgba(224,239,246,0.18))', transform: 'translateY(-11px)' }} />
      <div style={{ position: 'absolute', top: '18%', left: 0, right: 0, textAlign: 'center', fontSize: 35, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.045em', color: '#f4faff' }}>{value}</div>
      <div style={{ position: 'absolute', top: '67%', left: 0, right: 0, textAlign: 'center', fontSize: 15, lineHeight: 1, fontWeight: 600, color: '#e2edf3' }}>{label}</div>
    </div>
  );
}

type CommandModuleCardProps = {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  status?: ReactNode;
  actionLabel?: ReactNode;
};

export function CommandModuleCard({ icon, title, description, status, actionLabel = 'Open module' }: CommandModuleCardProps) {
  return (
    <div style={{ ...shell, borderRadius: 10, padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(163,236,255,0.16)', background: 'linear-gradient(180deg, rgba(22,34,51,0.92) 0%, rgba(12,18,28,0.92) 100%)', color: '#eefaff' }}>{icon}</div>
        {status ? <div>{status}</div> : null}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontSize: 18, lineHeight: 1.15, color: '#eef7fd', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: '#8ea5b6' }}>{description}</div>
      </div>
      <div style={{ border: '1px solid rgba(137,186,214,0.14)', borderRadius: 8, padding: 10, background: 'linear-gradient(180deg, rgba(18,27,39,0.5) 0%, rgba(11,17,26,0.6) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, fontWeight: 700, color: '#b2c7d6' }}>Command module</div>
        <button type="button" style={{ minHeight: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(137,186,214,0.22)', background: 'linear-gradient(180deg, rgba(24,35,49,0.96) 0%, rgba(13,19,28,0.96) 100%)', color: '#e9f5ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{actionLabel}</button>
      </div>
    </div>
  );
}

type SidebarNavigationItem = {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: ReactNode;
};

type SidebarNavigationProps = {
  title?: ReactNode;
  headerLabel?: ReactNode;
  items: SidebarNavigationItem[];
};

export function SidebarNavigation({ title = 'Navigation', headerLabel, items }: SidebarNavigationProps) {
  return (
    <div style={{ ...shell, borderRadius: 10, display: 'grid', gap: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(137,186,214,0.1)' }}>
        {headerLabel ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: 28, padding: '0 12px', marginBottom: 8, borderRadius: 3, border: '1px solid rgba(186, 220, 238, 0.18)', background: 'linear-gradient(180deg, rgba(36, 52, 68, 0.9) 0%, rgba(18, 28, 39, 0.94) 100%)', color: '#eef7fd', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {headerLabel}
          </div>
        ) : null}
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11, fontWeight: 700, color: '#b2c7d6', marginBottom: 4 }}>Sidebar</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#eef7fd' }}>{title}</div>
      </div>
      <div style={{ display: 'grid', gap: 8, padding: 12 }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0,1fr) auto',
              alignItems: 'center',
              gap: 10,
              padding: '12px 12px',
              borderRadius: 8,
              border: item.active ? '1px solid rgba(163,236,255,0.22)' : '1px solid rgba(137,186,214,0.1)',
              background: item.active ? 'linear-gradient(180deg, rgba(20,31,45,0.82) 0%, rgba(12,18,28,0.9) 100%)' : 'linear-gradient(180deg, rgba(18,27,39,0.42) 0%, rgba(11,17,26,0.46) 100%)',
              color: item.active ? '#eef7fd' : '#b2c7d6',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
            <span style={{ minWidth: 0 }}>{item.label}</span>
            {item.badge ? <span style={{ display: 'inline-flex', alignItems: 'center' }}>{item.badge}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SidebarNavigationReplica() {
  return (
    <NavMenu
      title="Sidebar Navigation"
      subtitle="Expandable Menu"
      defaultActiveId="projects"
      items={[
        { id: 'dashboard', label: 'Dashboard', icon: <span style={{ fontSize: 16, transform: 'scale(1.15)', display: 'inline-block' }}>⌂</span> },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: <span style={{ fontSize: 16 }}>∣∣∣</span>,
          children: [
            { id: 'analytics:overview', label: 'Overview' },
            { id: 'analytics:funnels', label: 'Funnels' },
            { id: 'analytics:engagement', label: 'Engagement' },
          ],
        },
        { id: 'projects', label: 'Projects', icon: <span style={{ fontSize: 16 }}>▣</span> },
        { id: 'tasks', label: 'Tasks', icon: <span style={{ fontSize: 16 }}>▤</span> },
        {
          id: 'reports',
          label: 'Reports',
          icon: <span style={{ fontSize: 16 }}>◫</span>,
          children: [
            { id: 'reports:daily', label: 'Daily' },
            { id: 'reports:weekly', label: 'Weekly' },
            { id: 'reports:exports', label: 'Exports' },
          ],
        },
        { id: 'settings', label: 'Settings', icon: <span style={{ fontSize: 16 }}>⚙</span> },
      ]}
    />
  );
}

type UserProfileDropdownProps = {
  name: ReactNode;
  org: ReactNode;
  avatar: ReactNode;
  open?: boolean;
};

export function MultiLineTextReplica(props: {
  label?: ReactNode;
  value?: string;
  placeholder?: string;
  lines?: number;
  scrollable?: boolean;
  resizable?: boolean;
}) {
  return <MultiLineTextField {...props} />;
}

export function DataTableReplica() {
  const rows: InstrumentTableRow[] = [
    { id: 'row-1', icon: '✎', name: 'Range Alpha', category: 'Range', status: { tone: 'green', label: 'Fans' }, date: '06 14 2021', actions: [22, 18] },
    { id: 'row-2', icon: '⌕', name: 'Category View', category: 'Category', status: { tone: 'amber', label: 'Pending' }, date: '06 14 2021', actions: [30, 20] },
    {
      id: 'row-3',
      icon: '✓',
      name: 'Detail View',
      category: 'Category',
      status: { tone: 'green', label: 'Pending' },
      date: '06 14 2021',
      actions: [26, 22],
      children: [
        { id: 'row-3-a', icon: '✓', name: 'Nested Detail A', category: 'Category', status: { tone: 'green', label: 'Pending' }, date: '06 14 2021', actions: [28, 18], nested: true },
        { id: 'row-3-b', icon: '✓', name: 'Nested Detail B', category: '', status: { tone: 'amber', label: 'Pending' }, date: '06 14 2021', actions: [24, 22], nested: true },
      ],
    },
    { id: 'row-4', icon: '⌘', name: 'Archive Unit', category: 'Category', status: { tone: 'amber', label: 'Pending' }, date: '06 15 2021', actions: [18, 18] },
  ];

  return <InstrumentDataTable title="Data Table" rows={rows} selectable defaultExpandedParents={['row-3']} />;
}

export function DataTableColorStudy() {
  const source = '/ui-kit-reference/snips/data-table.png';
  const sourceWidth = 680;
  const groups: Array<{ name: string; notes: string; crop: { x: number; y: number; w: number; h: number }; previewHeight: number; samples: Array<{ label: string; colors: string[] }> }> = [
    {
      name: 'Title band',
      notes: 'Dark band behind the “Data Table” title. Source sample looked darker than our earlier interpretation.',
      crop: { x: 10, y: 6, w: 300, h: 26 },
      previewHeight: 54,
      samples: [
        { label: 'A', colors: ['#18252D', '#2D3C45', '#384852'] },
        { label: 'B', colors: ['#1A272F', '#33454F', '#4B5A64'] },
        { label: 'C', colors: ['#18262F', '#273A47', '#334957'] },
      ],
    },
    {
      name: 'Header row',
      notes: 'Locked base color is `#18232B`. The question now is treatment: how the row varies/lightens across that dark base.',
      crop: { x: 6, y: 36, w: 668, h: 26 },
      previewHeight: 52,
      samples: [
        { label: 'A · Flat-ish', colors: ['#18232B', '#18232B', '#18232B'] },
        { label: 'B · Vertical panel gradient', colors: ['#18232B', '#22313A', '#2F3E47'] },
        { label: 'C · Slightly lighter band', colors: ['#18232B', '#2A3943', '#35454F'] },
      ],
    },
    {
      name: 'Default body row',
      notes: 'Main row surface. This should likely carry more of the mid steel-blue than we had before.',
      crop: { x: 6, y: 66, w: 668, h: 28 },
      previewHeight: 52,
      samples: [
        { label: 'A', colors: ['#1A2831', '#253A47', '#314A5A'] },
        { label: 'B', colors: ['#192831', '#253947', '#334B5A'] },
        { label: 'C', colors: ['#253A47', '#314A5A', '#4D636E'] },
      ],
    },
    {
      name: 'Selected row',
      notes: 'Still dark, but with a cool lifted steel/cyan tint. Not bright cyan, more dark steel-blue plus pale lift.',
      crop: { x: 6, y: 88, w: 668, h: 28 },
      previewHeight: 52,
      samples: [
        { label: 'A', colors: ['#1E2F3A', '#263946', '#324451'] },
        { label: 'B', colors: ['#324451', '#566774', '#718F9F'] },
        { label: 'C', colors: ['#263946', '#324451', '#9FBBC8'] },
      ],
    },
    {
      name: 'Footer strip',
      notes: 'Similar family to the body, but slightly lifted and more structured.',
      crop: { x: 6, y: 252, w: 668, h: 28 },
      previewHeight: 52,
      samples: [
        { label: 'A', colors: ['#162831', '#253B47', '#2F4B5B'] },
        { label: 'B', colors: ['#253B47', '#4C6670', '#5C8EA1'] },
        { label: 'C', colors: ['#162831', '#2F4B5B', '#ABC1C6'] },
      ],
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {groups.map((group) => (
        <div key={group.name} style={{ border: '1px solid rgba(151,183,199,0.14)', background: 'linear-gradient(180deg, rgba(24,35,48,0.74) 0%, rgba(12,18,26,0.88) 100%)', padding: 12, display: 'grid', gap: 10 }}>
          <div>
            <div style={{ color: '#eef7fd', fontSize: 14, fontWeight: 600 }}>{group.name}</div>
            <div style={{ color: '#9fb5c2', fontSize: 12, lineHeight: 1.45 }}>{group.notes}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#dbe8ef', fontSize: 12, fontWeight: 700 }}>Source slice</div>
              <div style={{ border: '1px solid rgba(151,183,199,0.16)', background: '#0d141b', padding: 6 }}>
                <div
                  style={{
                    width: '100%',
                    height: group.previewHeight,
                    backgroundImage: `url(${source})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${(220 / group.crop.w) * sourceWidth}px auto`,
                    backgroundPosition: `-${(220 / group.crop.w) * group.crop.x}px -${(220 / group.crop.w) * group.crop.y}px`,
                    border: '1px solid rgba(151,183,199,0.12)',
                  }}
                />
              </div>
              <code style={{ fontSize: 11, color: '#b8cad4', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: 0 }}>
                x:{group.crop.x} y:{group.crop.y} w:{group.crop.w} h:{group.crop.h}
              </code>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {group.samples.map((sample) => (
                <div key={sample.label} style={{ border: '1px solid rgba(151,183,199,0.14)', padding: 8, display: 'grid', gap: 8, background: 'rgba(8,12,18,0.3)' }}>
                  <div style={{ color: '#dbe8ef', fontSize: 12, fontWeight: 700 }}>{sample.label}</div>
                  <div style={{ minHeight: 44, border: '1px solid rgba(151,183,199,0.16)', background: group.name === 'Header row' && sample.label.startsWith('A') ? sample.colors[0] : group.name === 'Header row' && sample.label.startsWith('B') ? `radial-gradient(circle at 18% 40%, rgba(143,151,157,0.08), transparent 28%), linear-gradient(180deg, ${sample.colors[0]} 0%, ${sample.colors[1]} 58%, ${sample.colors[2]} 100%)` : group.name === 'Header row' && sample.label.startsWith('C') ? `radial-gradient(circle at 72% 48%, rgba(117,128,136,0.08), transparent 28%), linear-gradient(180deg, ${sample.colors[0]} 0%, ${sample.colors[1]} 56%, ${sample.colors[2]} 100%)` : `linear-gradient(180deg, ${sample.colors[0]} 0%, ${sample.colors[1]} 56%, ${sample.colors[2]} 100%)` }} />
                  <div style={{ display: 'grid', gap: 4 }}>
                    {sample.colors.map((color) => (
                      <code key={color} style={{ fontSize: 11, color: '#b8cad4', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 0 }}>{color}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTableTypographyStudy() {
  const samples = [
    {
      label: 'A · Clean technical sans',
      style: {
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#d6e3eb',
      },
    },
    {
      label: 'B · Slightly tighter / more instrument-like',
      style: {
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: '#dce8ef',
      },
    },
    {
      label: 'C · A touch more modern system-sans',
      style: {
        fontFamily: '"IBM Plex Sans", Inter, "Segoe UI", Arial, sans-serif',
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: '-0.015em',
        color: '#d6e3eb',
      },
    },
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
      {samples.map((sample) => (
        <div key={sample.label} style={{ border: '1px solid rgba(151,183,199,0.14)', padding: 10, display: 'grid', gap: 10, background: 'linear-gradient(180deg, #18232B 0%, #1B2630 54%, #1E2A33 100%)' }}>
          <div style={{ color: '#9fb5c2', fontSize: 12, fontWeight: 700 }}>{sample.label}</div>
          <div style={{ minHeight: 58, display: 'grid', alignItems: 'center', border: '1px solid rgba(156,198,216,0.14)', padding: '0 12px', background: 'radial-gradient(circle at 22% 35%, rgba(171,193,198,0.03), transparent 22%), linear-gradient(180deg, #18232B 0%, #1B2630 54%, #1E2A33 100%)' }}>
            <span style={sample.style}>Data Table</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusChipsReplica({
  chipBackgroundColor = 'rgba(28, 43, 57, 0.92)',
  chipBackgroundEffect = 'gradient',
  fontColor,
  haloBoost = 1.45,
}: {
  chipBackgroundColor?: string;
  chipBackgroundEffect?: 'flat' | 'matte' | 'gradient' | 'glow' | 'neon';
  fontColor?: string;
  haloBoost?: number;
} = {}) {
  const [activeTop, setActiveTop] = useState<string>('Selected');
  const [activeBottom, setActiveBottom] = useState<string>('Selected');

  const topRow: { label: string; tone: StatusChipTone }[] = [
    { label: 'Default', tone: 'default' },
    { label: 'Hover', tone: 'hover' },
    { label: 'Selected', tone: 'selected' },
    { label: 'Disabled', tone: 'disabled' },
    { label: 'Success', tone: 'success' },
    { label: 'Warning', tone: 'warning' },
    { label: 'Error', tone: 'error' },
  ];

  const bottomRow: { label: string; tone: StatusChipTone; trailing?: string }[] = [
    { label: 'Default', tone: 'default', trailing: '›' },
    { label: 'Hover', tone: 'hover', trailing: '›' },
    { label: 'Selected', tone: 'selected' },
    { label: 'Disabled', tone: 'disabled', trailing: '›' },
    { label: 'Success', tone: 'success', trailing: '✓' },
    { label: 'Error', tone: 'error' },
  ];

  return (
    <div
      role="group"
      aria-label="Status chips replica"
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 2,
        border: '1px solid rgba(176, 208, 224, 0.16)',
        background: 'linear-gradient(180deg, rgba(22, 32, 44, 0.96) 0%, rgba(12, 18, 26, 0.98) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
        padding: '14px 12px 16px',
        display: 'grid',
        gap: 16,
      }}
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 10 }}>
          <div style={{ color: '#dfeaf1', fontSize: 14, fontWeight: 500 }}>Chips</div>
          <span aria-hidden="true" style={{ height: 1, background: 'linear-gradient(90deg, rgba(232,243,249,0.7), rgba(214,230,240,0.12) 45%, transparent)' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {topRow.map((item) => (
            <StatusChip
              key={item.label}
              text={item.label}
              tone={item.tone}
              chipStyle="rounded"
              clickable
              active={activeTop === item.label}
              onClick={() => setActiveTop(item.label)}
              chipBackgroundColor={chipBackgroundColor}
              backgroundEffect={chipBackgroundEffect}
              fontColor={fontColor}
              haloBoost={haloBoost}
            />
          ))}
        </div>
      </div>
      <span aria-hidden="true" style={{ display: 'block', height: 1, background: 'linear-gradient(90deg, rgba(232,243,249,0.58), rgba(214,230,240,0.1) 50%, transparent)' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {bottomRow.map((item) => (
          <StatusChip
            key={item.label}
            text={item.label}
            tone={item.tone}
            chipStyle="box"
            clickable
            active={activeBottom === item.label}
            onClick={() => setActiveBottom(item.label)}
            trailing={item.trailing}
            chipBackgroundColor={chipBackgroundColor}
            backgroundEffect={chipBackgroundEffect}
            fontColor={fontColor}
            haloBoost={haloBoost}
          />
        ))}
      </div>
    </div>
  );
}

export function UserProfileDropdown({ name, org, avatar, open = true }: UserProfileDropdownProps) {
  return (
    <div style={{ ...shell, borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
      <button
        type="button"
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0,1fr) auto',
          alignItems: 'center',
          gap: 12,
          padding: '12px 12px',
          borderRadius: 8,
          border: '1px solid rgba(137,186,214,0.12)',
          background: 'linear-gradient(180deg, rgba(18,27,39,0.52) 0%, rgba(11,17,26,0.58) 100%)',
          color: '#eef7fd',
          textAlign: 'left',
        }}
      >
        <span style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(163,236,255,0.14)', background: 'linear-gradient(180deg, rgba(22,34,51,0.92) 0%, rgba(12,18,28,0.92) 100%)' }}>{avatar}</span>
        <span style={{ display: 'grid', minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: '#eef7fd' }}>{name}</span>
          <span style={{ color: '#7f97a8', fontSize: 13 }}>{org}</span>
        </span>
        <span style={{ color: '#7f97a8' }}>▾</span>
      </button>
      {open ? (
        <div style={{ border: '1px solid rgba(137,186,214,0.12)', borderRadius: 8, padding: 4, background: 'linear-gradient(180deg, rgba(18,27,39,0.46) 0%, rgba(11,17,26,0.5) 100%)', display: 'grid', gap: 2 }}>
          {['View profile', 'Switch workspace', 'Sign out'].map((item) => (
            <button key={item} type="button" style={{ width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: '#b2c7d6' }}>{item}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CommandPalettePanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  results?: { title: string; meta?: ReactNode }[];
};

export function CommandPalettePanelReplica({ query, onQueryChange, onSubmit }: { query: string; onQueryChange: (value: string) => void; onSubmit?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      role="group"
      aria-label="Command palette replica"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 130,
        borderRadius: 2,
        border: '2px solid rgba(208, 234, 246, 0.34)',
        background: 'linear-gradient(180deg, rgba(23, 34, 48, 0.98) 0%, rgba(11, 18, 28, 1) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 20px rgba(180, 223, 243, 0.035), 0 0 0 1px rgba(248,252,255,0.04)',
        overflow: 'hidden',
        padding: '18px 18px 16px',
        display: 'grid',
        alignContent: 'start',
        gap: 14,
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', top: 10, left: 12, right: 12, height: 1, background: 'linear-gradient(90deg, rgba(233,247,255,0.08), rgba(248,252,255,0.88) 22%, rgba(224,239,246,0.16) 55%, rgba(233,247,255,0.08))' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 10, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.82), rgba(224,239,246,0.12))' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.01em', color: '#eef7fd' }}>Command Palette</div>
          <span aria-hidden="true" style={{ height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.82), rgba(224,239,246,0.12) 48%, transparent)' }} />
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          minHeight: 42,
          borderRadius: 2,
          border: '2px solid rgba(208, 234, 246, 0.38)',
          background: 'linear-gradient(180deg, rgba(33, 52, 70, 0.96) 0%, rgba(18, 30, 41, 0.98) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 18px rgba(180, 223, 243, 0.04)',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0,1fr) auto',
          alignItems: 'center',
          gap: 12,
          padding: '0 12px 0 14px',
        }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0,1fr)',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
            gridColumn: '1 / 3',
            background: 'transparent',
            border: 0,
            padding: 0,
            margin: 0,
            color: 'inherit',
            textAlign: 'left',
            cursor: 'text',
          }}
        >
          <span style={{ color: '#eef7fd', fontSize: 32, lineHeight: 1, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search ..."
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit?.();
            }}
            style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#eef7fd', fontSize: 16, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.01em', padding: '0 0 0 6px' }}
          />
        </button>
        <button
          type="button"
          onClick={() => onSubmit?.()}
          aria-label="Submit search"
          style={{ background: 'transparent', border: 0, padding: 0, margin: 0, color: '#d7e6ef', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}
        >
          ▸
        </button>
      </div>
    </div>
  );
}

export function CommandPalettePanel({ query, onQueryChange, results = [] }: CommandPalettePanelProps) {
  return (
    <div style={{ ...shell, borderRadius: 10, display: 'grid', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(137,186,214,0.1)', display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11, fontWeight: 700, color: '#b2c7d6', marginBottom: 4 }}>Command palette</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#eef7fd' }}>Quick actions and search</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 26, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(137,186,214,0.16)', color: '#e9f5ff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
      </div>
      <div style={{ display: 'grid', gap: 12, padding: 16 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, fontWeight: 700, color: '#b2c7d6' }}>Search</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', alignItems: 'center', gap: 10, minHeight: 46, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(137,186,214,0.26)', background: 'linear-gradient(180deg, rgba(16,23,33,0.98) 0%, rgba(11,17,26,0.98) 100%)' }}>
            <span style={{ color: '#b2c7d6' }}>⌕</span>
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search datasets, actions, or workflows…" style={{ width: '100%', minWidth: 0, background: 'transparent', border: 0, outline: 0, color: '#e9f5ff', padding: 0 }} />
            <span style={{ color: '#7f97a8', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>⌘K</span>
          </div>
        </label>
        <div style={{ border: '1px solid rgba(137,186,214,0.12)', borderRadius: 8, padding: 4, background: 'linear-gradient(180deg, rgba(18,27,39,0.46) 0%, rgba(11,17,26,0.5) 100%)', display: 'grid', gap: 4 }}>
          {results.map((result) => (
            <button key={result.title} type="button" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: '#b2c7d6', textAlign: 'left' }}>
              <span>{result.title}</span>
              {result.meta ? <span>{result.meta}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
