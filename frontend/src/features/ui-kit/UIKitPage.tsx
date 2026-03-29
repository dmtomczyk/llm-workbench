import { useEffect, useRef, useState } from 'react';

import { Alert } from '../../design-system/components/Alert';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { CheckboxRow } from '../../design-system/components/CheckboxRow';
import { DataTable } from '../../design-system/components/DataTable';
import { EmptyState } from '../../design-system/components/EmptyState';
import { IconButton } from '../../design-system/components/IconButton';
import { Input } from '../../design-system/components/Input';
import { KeyValueGrid } from '../../design-system/components/KeyValueGrid';
import { Modal } from '../../design-system/components/Modal';
import { Panel, PanelBody, PanelHeader, PanelSection } from '../../design-system/components/Panel';
import { Popover, PopoverItem } from '../../design-system/components/Popover';
import { SearchInput } from '../../design-system/components/SearchInput';
import { Select } from '../../design-system/components/Select';
import { CommandModuleCard, CommandPalettePanel, CommandPalettePanelReplica, DataTableReplica, DataTableTypographyStudy, MultiLineTextReplica, SidebarNavigation, SidebarNavigationReplica, StatusChipsReplica, UserProfileDropdown, UsersMetricCard, UsersMetricCardV2 } from '../../design-system/components/BridgeReferenceComponents';
import { CommandPaletteTile } from '../../design-system/components/CommandPaletteTile';
import { InstrumentDataTable } from '../../design-system/components/InstrumentDataTable';
import { MetricTile } from '../../design-system/components/MetricTile';
import { MultiLineTextField } from '../../design-system/components/MultiLineTextField';
import { NavMenu } from '../../design-system/components/NavMenu';
import { StatusChip } from '../../design-system/components/StatusChip';
import { Textarea } from '../../design-system/components/Textarea';
import { BodyMuted, Kicker, MetaLabel, MetaValue, MetricValue, PanelTitle, SectionTitle } from '../../design-system/components/Typography';
import { AlertIcon } from '../../design-system/icons/AlertIcon';
import { GridIcon } from '../../design-system/icons/GridIcon';
import { SearchIcon } from '../../design-system/icons/SearchIcon';
import { ShieldIcon } from '../../design-system/icons/ShieldIcon';
import { TargetIcon } from '../../design-system/icons/TargetIcon';
import { UserIcon } from '../../design-system/icons/UserIcon';

export function UIKitPage() {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('mission status');
  const [activeIcon, setActiveIcon] = useState<'search' | 'grid' | 'target' | 'shield' | 'alert' | 'user'>('search');
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPopover) return;
    const onPointerDown = (event: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showPopover]);

  return (
    <div className="stack">
      <Panel className="ui-kit-hero ui-kit-panel-shell ui-kit-panel-shell-interactive" variant="interactive">
        <PanelHeader>
          <div>
            <Kicker>BRIDGE UI Library</Kicker>
            <SectionTitle>Public library structure</SectionTitle>
            <BodyMuted>This page is now split into three practical layers: foundations for tokens and rules, component families for reusable primitives, and a source-board lab for visual comparison against the original BRIDGE references.</BodyMuted>
          </div>
        </PanelHeader>
        <PanelBody className="stack">
          <div className="row wrap ui-kit-pill-row">
            <Badge>Foundations</Badge>
            <Badge>Components</Badge>
            <Badge>Patterns</Badge>
            <Badge>Reference Lab</Badge>
          </div>
        </PanelBody>
      </Panel>

      <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
        <PanelHeader>
          <div>
            <Kicker>Phase 1 / Information architecture</Kicker>
            <PanelTitle>Library map</PanelTitle>
            <BodyMuted>The BRIDGE library should read like a public UI library: foundations first, reusable component families second, and higher-order patterns after that. This keeps the source-board influence visible without turning the system into a pile of one-off experiments.</BodyMuted>
          </div>
        </PanelHeader>
        <PanelBody className="grid two-col">
          <PanelSection className="ui-kit-library-card">
            <Kicker>Foundations</Kicker>
            <PanelTitle>Tokens and construction rules</PanelTitle>
            <ul className="list compact-list">
              <li>Color palette</li>
              <li>Typography hierarchy</li>
              <li>Spacing and density</li>
              <li>Radii and frame language</li>
              <li>Borders, rails, nodes, glows</li>
            </ul>
          </PanelSection>
          <PanelSection className="ui-kit-library-card">
            <Kicker>Components</Kicker>
            <PanelTitle>Reusable primitives</PanelTitle>
            <ul className="list compact-list">
              <li>Actions — buttons, icon buttons, toggles</li>
              <li>Forms — input, search, select, textarea</li>
              <li>Navigation — tabs, breadcrumbs, profile controls</li>
              <li>Data display — badges, tables, key/value, empty states</li>
              <li>Feedback and overlays — alerts, popovers, modals</li>
            </ul>
          </PanelSection>
          <PanelSection className="ui-kit-library-card">
            <Kicker>Patterns</Kicker>
            <PanelTitle>Structured assemblies</PanelTitle>
            <ul className="list compact-list">
              <li>Dashboard metric tiles</li>
              <li>Command/search bars</li>
              <li>Status panels and alert shells</li>
              <li>Navigation shells and sidebars</li>
              <li>Inspector and settings layouts</li>
            </ul>
          </PanelSection>
          <PanelSection className="ui-kit-library-card">
            <Kicker>Reference lab</Kicker>
            <PanelTitle>Source-to-library comparison</PanelTitle>
            <ul className="list compact-list">
              <li>8 source boards kept in one place</li>
              <li>Component extraction under each board</li>
              <li>Recreated studies beside the originals</li>
              <li>Use this as the refinement loop, not the final docs structure</li>
            </ul>
          </PanelSection>
        </PanelBody>
      </Panel>

      <div className="grid two-col">
        <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
          <PanelHeader>
            <div>
              <Kicker>Phase 2 / Foundations</Kicker>
              <PanelTitle>Color palette</PanelTitle>
              <BodyMuted>The palette should feel like a public library foundation, not a mood board: dark graphite-blue canvas, layered instrument surfaces, cool rail accents, bright seam nodes, and semantic colors that stay readable without turning the UI neon.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-swatch-grid">
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-canvas" /><strong>Canvas</strong><span>Global backdrop / #0A1018</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-surface-1" /><strong>Surface 1</strong><span>Default modules / #101826 → #0D141E</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-surface-2" /><strong>Surface 2</strong><span>Elevated modules / #162233 → #101722</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-rail" /><strong>Rail</strong><span>Frame lines, dividers, technical chrome</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-node" /><strong>Node</strong><span>Seam highlights, active joints, bright endpoints</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-text" /><strong>Text</strong><span>Primary, secondary, and muted hierarchy</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-success" /><strong>Success</strong><span>Ready, healthy, completed, validated</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-amber" /><strong>Warning</strong><span>Caution, transient alert, degraded state</span></div>
              <div className="ui-kit-swatch-card"><span className="ui-kit-swatch ui-kit-swatch-danger" /><strong>Danger</strong><span>Error, destructive action, critical alert</span></div>
            </div>
            <Alert>Working palette rule: cyan is no longer “the theme color.” It is the rail/node family. The actual theme is dark graphite-blue surfaces with cool technical highlights.</Alert>
          </PanelBody>
        </Panel>

        <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
          <PanelHeader>
            <div>
              <Kicker>Phase 2 / Foundations</Kicker>
              <PanelTitle>Construction principles</PanelTitle>
              <BodyMuted>These are the rules that should govern component refinement going forward.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-principles-grid">
              <PanelSection className="ds-panel-section-dense"><MetaLabel>1</MetaLabel><PanelTitle>Frames before flourishes</PanelTitle><BodyMuted>Start with a shell, perimeter rail, or contained surface. Ornament only reinforces structure.</BodyMuted></PanelSection>
              <PanelSection className="ds-panel-section-dense"><MetaLabel>2</MetaLabel><PanelTitle>Nodes are scarce</PanelTitle><BodyMuted>Bright flares should mark seams, joints, or active points — not every corner.</BodyMuted></PanelSection>
              <PanelSection className="ds-panel-section-dense"><MetaLabel>3</MetaLabel><PanelTitle>Density is deliberate</PanelTitle><BodyMuted>Controls should feel compact and instrument-like, but still readable in product use.</BodyMuted></PanelSection>
              <PanelSection className="ds-panel-section-dense"><MetaLabel>4</MetaLabel><PanelTitle>Semantics over spectacle</PanelTitle><BodyMuted>Warning, success, and error states should read quickly without becoming neon signage.</BodyMuted></PanelSection>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid two-col">
        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Named source translations</Kicker>
              <PanelTitle>Actual source-derived components</PanelTitle>
              <BodyMuted>These are the exact named components you called out, translated into reusable React components and wired into the UI kit as live modules.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-users-compare">
              <div className="ui-kit-users-compare-card">
                <Kicker>Source</Kicker>
                <img className="ui-kit-reference-image ui-kit-users-reference" src="/ui-kit-reference/dashboard-components/01-stat-users.png" alt="Source crop for Users metric card" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Current</Kicker>
                <UsersMetricCard value="42.7k" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Replica</Kicker>
                <UsersMetricCardV2 value="42.7k" />
              </div>
            </div>
            <PanelSection>
              <div className="ui-kit-metric-tile-grid">
                <div className="ui-kit-users-compare-card">
                  <Kicker>Reusable MetricTile</Kicker>
                  <MetricTile value="42.7k" label="Users" emphasis="strong" tone="neutral" />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>DAU</Kicker>
                  <MetricTile value="8.4k" label="DAU" tone="info" />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Tokens Used</Kicker>
                  <MetricTile value="1.2M" label="Tokens Used" tone="warning" />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Critical Alerts</Kicker>
                  <MetricTile value="12" label="Critical Alerts" tone="danger" emphasis="strong" size="sm" />
                </div>
              </div>
            </PanelSection>
            <div className="ui-kit-module-grid">
              <CommandModuleCard
                icon={<SearchIcon className="ui-kit-surface-icon" />}
                title="Mission search"
                description="Frame-wrapped quick-launch module for search, commands, and mission lookups."
                status={<Badge variant="info">Ctrl+K</Badge>}
                actionLabel={<>Open module</>}
              />
              <UserProfileDropdown
                avatar={<UserIcon className="ui-kit-surface-icon" />}
                name="John Doe"
                org="Acme Corp"
                open
              />
            </div>
          </PanelBody>
        </Panel>

        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Sidebar navigation</Kicker>
              <PanelTitle>Source, current, replica</PanelTitle>
              <BodyMuted>This section now follows the normal workflow: the actual source crop, the existing guessed translation as Current, and a literal Replica tuned against the crop before any reusable abstraction.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-users-compare">
              <div className="ui-kit-users-compare-card">
                <Kicker>Source</Kicker>
                <img className="ui-kit-reference-image ui-kit-users-reference" src="/ui-kit-reference/navigation-components/02-sidebar-navigation.png" alt="Source crop for Sidebar Navigation" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Current</Kicker>
                <SidebarNavigation
                  headerLabel="Primary Nav"
                  title="Primary routes"
                  items={[
                    { id: 'overview', label: 'Overview', icon: <GridIcon className="ui-kit-button-icon" />, active: true },
                    { id: 'missions', label: 'Missions', icon: <TargetIcon className="ui-kit-button-icon" />, badge: <Badge variant="info">12</Badge> },
                    { id: 'security', label: 'Security', icon: <ShieldIcon className="ui-kit-button-icon" /> },
                    { id: 'alerts', label: 'Alerts', icon: <AlertIcon className="ui-kit-button-icon" />, badge: <Badge variant="warning">3</Badge> },
                  ]}
                />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Replica</Kicker>
                <SidebarNavigationReplica />
              </div>
            </div>
            <PanelSection>
              <div className="ui-kit-metric-tile-grid">
                <div className="ui-kit-users-compare-card">
                  <Kicker>Reusable NavMenu</Kicker>
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
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Mission Nav Variant</Kicker>
                  <NavMenu
                    title="Mission Navigation"
                    shortTitle="Mission Nav"
                    subtitle="Operational Routes"
                    shortSubtitle="Ops Routes"
                    minHeight={420}
                    narrow
                    defaultActiveId="missions:queued"
                    defaultOpenGroupId="missions"
                    items={[
                      { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: <GridIcon className="ui-kit-button-icon" /> },
                      {
                        id: 'missions',
                        label: 'Missions',
                        shortLabel: 'Mission',
                        icon: <TargetIcon className="ui-kit-button-icon" />,
                        children: [
                          { id: 'missions:queued', label: 'Queued', shortLabel: 'Queue' },
                          { id: 'missions:active', label: 'Active', shortLabel: 'Active' },
                          { id: 'missions:complete', label: 'Complete', shortLabel: 'Done' },
                        ],
                      },
                      { id: 'security', label: 'Security', shortLabel: 'Security', icon: <ShieldIcon className="ui-kit-button-icon" /> },
                      { id: 'alerts', label: 'Alerts', shortLabel: 'Alerts', icon: <AlertIcon className="ui-kit-button-icon" />, trailing: <Badge variant="warning">3</Badge> },
                    ]}
                  />
                </div>
              </div>
            </PanelSection>
          </PanelBody>
        </Panel>

        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Data table</Kicker>
              <PanelTitle>Source, current, replica</PanelTitle>
              <BodyMuted>This snip looks much more instrument-panel-like than the current generic data grid, so we’re treating it as a fresh component study: source crop first, current system table second, and a literal replica before any reusable extraction.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-users-compare">
              <div className="ui-kit-users-compare-card">
                <Kicker>Source</Kicker>
                <img className="ui-kit-reference-image ui-kit-users-reference" src="/ui-kit-reference/snips/data-table.png" alt="Source snip for data table component" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Current</Kicker>
                <DataTable
                  columns={['ID', 'Name', 'Category', 'Status', 'Date', 'Actions']}
                  rows={[
                    ['1', 'Range', 'Fans', 'Pending', '06 14 2021', 'Edit'],
                    ['2', 'Category', 'Category', 'Pending', '06 14 2021', 'Open'],
                    ['3', 'Category', 'Category', 'Pending', '06 14 2021', 'Review'],
                  ]}
                  compact
                />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Replica</Kicker>
                <DataTableReplica />
              </div>
            </div>
            <PanelSection>
              <div className="ui-kit-users-compare-card">
                <Kicker>Title typography study</Kicker>
                <BodyMuted>Quick title treatments for “Data Table” based on: soft off-white, slightly bold, modern sans-serif, technical not editorial.</BodyMuted>
                <DataTableTypographyStudy />
              </div>
            </PanelSection>
            <PanelSection>
              <div className="ui-kit-metric-tile-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Reusable InstrumentDataTable</Kicker>
                  <InstrumentDataTable
                    title="Data Table"
                    selectable
                    defaultExpandedParents={['row-3']}
                    rows={[
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
                    ]}
                  />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Compact Variant</Kicker>
                  <InstrumentDataTable
                    title="Mission Data"
                    selectable={false}
                    pageSize={2}
                    rows={[
                      { id: 'm-1', icon: '✓', name: 'Queued Mission', category: 'Ops', status: { tone: 'green', label: 'Ready' }, date: '06 16 2021', actions: [24, 18] },
                      { id: 'm-2', icon: '⌕', name: 'Review Package', category: 'Intel', status: { tone: 'amber', label: 'Pending' }, date: '06 17 2021', actions: [20, 20] },
                      { id: 'm-3', icon: '✎', name: 'Archive Sync', category: 'System', status: { tone: 'amber', label: 'Hold' }, date: '06 18 2021', actions: [18, 14] },
                    ]}
                  />
                </div>
              </div>
            </PanelSection>
          </PanelBody>
        </Panel>

        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Status chips</Kicker>
              <PanelTitle>Source, current, replica</PanelTitle>
              <BodyMuted>New snip workflow target: treat the source as its own component family, compare it against the existing Badge primitives as Current, and tune a literal Replica before deciding what abstractions belong in the library.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-users-compare">
              <div className="ui-kit-users-compare-card">
                <Kicker>Source</Kicker>
                <img className="ui-kit-reference-image ui-kit-users-reference" src="/ui-kit-reference/snips/chips-status.png" alt="Source snip for status chips component" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Current</Kicker>
                <div className="stack" style={{ gap: 12 }}>
                  <div className="row wrap" style={{ gap: 10 }}>
                    <Badge>Default</Badge>
                    <Badge variant="info">Selected</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="danger">Error</Badge>
                  </div>
                  <div className="row wrap" style={{ gap: 10 }}>
                    <Button variant="ghost">Default</Button>
                    <Button variant="secondary">Selected</Button>
                    <Button variant="secondary">Success</Button>
                  </div>
                </div>
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Replica</Kicker>
                <StatusChipsReplica chipBackgroundEffect="glow" haloBoost={1.7} />
              </div>
            </div>
            <PanelSection>
              <div className="ui-kit-metric-tile-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Reusable StatusChip</Kicker>
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="row wrap" style={{ gap: 10 }}>
                      <StatusChip text="Default" chipStyle="rounded" clickable />
                      <StatusChip text="Selected" tone="selected" chipStyle="rounded" clickable defaultActive backgroundEffect="glow" haloBoost={1.7} />
                      <StatusChip text="Success" tone="success" chipStyle="rounded" clickable backgroundEffect="glow" haloBoost={1.7} />
                      <StatusChip text="Warning" tone="warning" chipStyle="rounded" clickable backgroundEffect="glow" haloBoost={1.7} />
                      <StatusChip text="Error" tone="error" chipStyle="rounded" clickable backgroundEffect="glow" haloBoost={1.7} />
                    </div>
                    <div className="row wrap" style={{ gap: 10 }}>
                      <StatusChip text="Default" chipStyle="box" trailing="›" clickable />
                      <StatusChip text="Selected" tone="selected" chipStyle="box" clickable defaultActive backgroundEffect="glow" haloBoost={1.7} />
                      <StatusChip text="Success" tone="success" chipStyle="box" trailing="✓" clickable backgroundEffect="glow" haloBoost={1.7} />
                      <StatusChip text="Error" tone="error" chipStyle="box" clickable backgroundEffect="glow" haloBoost={1.7} />
                    </div>
                  </div>
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Style Variants</Kicker>
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="row wrap" style={{ gap: 10 }}>
                      <StatusChip text="Matte" tone="default" chipStyle="rounded" backgroundEffect="matte" />
                      <StatusChip text="Neon" tone="selected" chipStyle="rounded" backgroundEffect="neon" haloBoost={2} />
                      <StatusChip text="Disabled" tone="disabled" chipStyle="rounded" />
                    </div>
                    <div className="row wrap" style={{ gap: 10 }}>
                      <StatusChip text="Custom" tone="warning" chipStyle="box" backgroundEffect="glow" chipBackgroundColor="rgba(62, 44, 20, 0.94)" fontColor="#fff2cf" trailing="›" />
                    </div>
                  </div>
                </div>
              </div>
            </PanelSection>
          </PanelBody>
        </Panel>

        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Multi-line text</Kicker>
              <PanelTitle>Source, current, replica</PanelTitle>
              <BodyMuted>This is the first pass from the new manual snips set: source crop first, existing system textarea as Current, and a literal framed Replica tuned to the screenshot before we extract anything reusable.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-users-compare">
              <div className="ui-kit-users-compare-card">
                <Kicker>Source</Kicker>
                <img className="ui-kit-reference-image ui-kit-users-reference" src="/ui-kit-reference/snips/multi-line-text.png" alt="Source snip for multi-line text component" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Current</Kicker>
                <Textarea label="Multi-Line Text" placeholder="" rows={4} />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Replica</Kicker>
                <MultiLineTextReplica placeholder="Type Here..." lines={4} scrollable resizable />
              </div>
            </div>
            <PanelSection>
              <div className="ui-kit-metric-tile-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Reusable MultiLineTextField</Kicker>
                  <MultiLineTextField label="Multi-Line Text" placeholder="Type Here..." lines={4} scrollable resizable />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Compact Notes Variant</Kicker>
                  <MultiLineTextField label="Notes" placeholder="Add note..." lines={3} scrollable={false} />
                </div>
              </div>
            </PanelSection>
          </PanelBody>
        </Panel>

        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Command palette panel</Kicker>
              <PanelTitle>Source, current, replica</PanelTitle>
              <BodyMuted>The source crop shows that this component is much more compact than the current implementation. Replica is now following the exact crop more literally before we attempt any reusable abstraction.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="ui-kit-users-compare">
              <div className="ui-kit-users-compare-card">
                <Kicker>Source</Kicker>
                <img className="ui-kit-reference-image ui-kit-users-reference" src="/ui-kit-reference/forms-components/18-command-palette.png" alt="Source crop for Command Palette panel" />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Current</Kicker>
                <CommandPalettePanel
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  results={[
                    { title: 'Open mission dashboard', meta: <Badge variant="info">Dashboard</Badge> },
                    { title: 'Search users', meta: <Badge variant="success">Users</Badge> },
                    { title: 'Inspect active alerts', meta: <Badge variant="warning">Alerts</Badge> },
                    { title: 'Open security review', meta: <Badge variant="danger">Critical</Badge> },
                  ]}
                />
              </div>
              <div className="ui-kit-users-compare-card">
                <Kicker>Replica</Kicker>
                <CommandPalettePanelReplica query={searchQuery} onQueryChange={setSearchQuery} onSubmit={() => { /* demo submit */ }} />
              </div>
            </div>
            <PanelSection>
              <div className="ui-kit-metric-tile-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Reusable Tile</Kicker>
                  <CommandPaletteTile value={searchQuery} onChange={setSearchQuery} onSubmit={() => { /* demo submit */ }} hotkey={{ ctrlKey: true, key: 'p' }} showResults defaultOpen results={[
                    { title: 'Open mission dashboard', meta: <Badge variant="info">Dashboard</Badge> },
                    { title: 'Search users', meta: <Badge variant="success">Users</Badge> },
                    { title: 'Inspect active alerts', meta: <Badge variant="warning">Alerts</Badge> },
                  ]} />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Mission Search</Kicker>
                  <CommandPaletteTile title="Mission Search" value={searchQuery} onChange={setSearchQuery} placeholder="Find missions ..." leadingIcon={<SearchIcon className="ui-kit-inline-icon" />} submitIcon="→" onSubmit={() => { /* demo submit */ }} hotkey={{ ctrlKey: true, key: 'm' }} />
                </div>
                <div className="ui-kit-users-compare-card">
                  <Kicker>Compact</Kicker>
                  <CommandPaletteTile title="Quick Search" value={searchQuery} onChange={setSearchQuery} placeholder="Search users ..." size="sm" leadingIcon={<UserIcon className="ui-kit-inline-icon" />} onSubmit={() => { /* demo submit */ }} showResults defaultOpen results={[
                    { title: 'John Doe', meta: <Badge variant="info">User</Badge> },
                    { title: 'Jane Smith', meta: <Badge variant="success">Active</Badge> },
                  ]} />
                </div>
              </div>
            </PanelSection>
            <div className="ui-kit-search-preview">
              <div>
                <MetaLabel>Current query</MetaLabel>
                <MetaValue>{searchQuery || '—'}</MetaValue>
              </div>
              <div className="row wrap">
                <Button variant="secondary"><SearchIcon className="ui-kit-inline-icon" />Run search</Button>
                <Button variant="ghost" onClick={() => setSearchQuery('')}>Clear</Button>
              </div>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
        <PanelHeader>
          <div>
            <Kicker>ROB reference extraction</Kicker>
            <PanelTitle>Original vs component studies</PanelTitle>
            <BodyMuted>These studies are derived directly from the source boards in <code>/public/ui-kit-reference/</code>. The left side now shows the actual reference image you provided for that motif; click any reference image to open the full source board. The right side shows the implemented component approximation so we can compare the reference language against the build.</BodyMuted>
          </div>
        </PanelHeader>
        <PanelBody className="stack">
          <div className="ui-kit-compare-grid">
            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Framed primary button</PanelTitle>
                <a href="/ui-kit-reference/Forms%20and%20Controls.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Forms%20and%20Controls.png" alt="Original BRIDGE Forms and Controls reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Forms and Controls<br /><strong>Reference motif:</strong> compact rectangular action button with thin frame rails, bright top edge, and softly illuminated perimeter.</BodyMuted>
                <div className="ui-kit-component-crops">
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/01-button-states-row.png" alt="Forms component crop: button states row" /><div><strong>Button states row</strong><span>Primary button family showing default, hover, active, and disabled states.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/02-icon-buttons-row.png" alt="Forms component crop: icon buttons row" /><div><strong>Icon buttons row</strong><span>Option buttons paired with circular icon-button variants.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/03-tabs-row.png" alt="Forms component crop: tabs row" /><div><strong>Tabs row</strong><span>Framed three-tab strip used for section switching.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/04-breadcrumb-nav.png" alt="Forms component crop: breadcrumb nav" /><div><strong>Breadcrumb nav</strong><span>Hierarchical location trail inside a framed shell.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/05-segmented-control.png" alt="Forms component crop: segmented control" /><div><strong>Segmented control</strong><span>Multi-option switch with a shared rectangular frame.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/06-text-input-field.png" alt="Forms component crop: text input field" /><div><strong>Text input field</strong><span>Standard framed text field with caret affordance.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/07-search-box.png" alt="Forms component crop: search box" /><div><strong>Search box</strong><span>Actual source search field with search icon and placeholder.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/08-select-field.png" alt="Forms component crop: select field" /><div><strong>Select field</strong><span>Framed select/input with location icon, label, and caret.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/09-checkbox-group.png" alt="Forms component crop: checkbox group" /><div><strong>Checkbox group</strong><span>Stacked checkbox options with aligned labels inside framed rows.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/10-radio-group.png" alt="Forms component crop: radio group" /><div><strong>Radio group</strong><span>Vertical exclusive-choice radio set with circular controls.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/11-inline-choice-row.png" alt="Forms component crop: inline choice row" /><div><strong>Inline choice row</strong><span>Mixed inline controls: icon actions, checkbox, radio, toggle, and switch-off state.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/12-sliders-row.png" alt="Forms component crop: sliders row" /><div><strong>Sliders row</strong><span>Range controls shown as a multi-slider demonstration strip.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/13-data-table.png" alt="Forms component crop: data table" /><div><strong>Data table</strong><span>Instrument-style data grid with status chips and pagination.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/14-time-picker.png" alt="Forms component crop: time picker" /><div><strong>Time picker</strong><span>Calendar/time selection module with framed header and date grid.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/15-alerts-row.png" alt="Forms component crop: alerts row" /><div><strong>Alerts row</strong><span>Semantic alert banners for warning and success states.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/16-modal-card.png" alt="Forms component crop: modal card" /><div><strong>Modal card</strong><span>Dialog shell with title and confirm/cancel actions.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/17-side-navigation.png" alt="Forms component crop: side navigation" /><div><strong>Side navigation</strong><span>Bottom-left navigation module with icon rail and destination pills.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/forms-components/18-command-palette.png" alt="Forms component crop: command palette" /><div><strong>Command palette</strong><span>Bottom command/search module with framed search field and action strip.</span></div></div>
                </div>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-button">
                  <span className="ui-kit-rob-rail top" />
                  <span className="ui-kit-rob-rail bottom" />
                  <span className="ui-kit-rob-node left" />
                  <span className="ui-kit-rob-node right" />
                  <span className="ui-kit-rob-label">Primary Action</span>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Framed search / command field</PanelTitle>
                <a href="/ui-kit-reference/Navigation.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Navigation.png" alt="Original BRIDGE Navigation reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Navigation<br /><strong>Reference motif:</strong> long horizontal field with perimeter shell, search icon on the left, stronger outer frame than standard SaaS inputs.</BodyMuted>
                <div className="ui-kit-component-crops">
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/01-global-search-bar.png" alt="Navigation component crop: global search bar" /><div><strong>Global search bar</strong><span>Primary framed search/command input spanning the header.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/02-sidebar-navigation.png" alt="Navigation component crop: sidebar navigation" /><div><strong>Sidebar navigation</strong><span>Primary vertical navigation rail with stacked destinations.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/03-top-utility-cluster.png" alt="Navigation component crop: top utility cluster" /><div><strong>Top utility cluster</strong><span>Compact header controls for status, filters, or utility actions.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/04-segmented-tab-bar.png" alt="Navigation component crop: segmented tab bar" /><div><strong>Segmented tab bar</strong><span>Horizontal section switcher with framed tabs.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/05-sidebar-secondary-group.png" alt="Navigation component crop: secondary sidebar group" /><div><strong>Secondary sidebar group</strong><span>Nested or grouped navigation block under the main rail.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/06-command-module-card.png" alt="Navigation component crop: command module card" /><div><strong>Command module card</strong><span>Framed module for command shortcuts or featured actions.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/07-quick-actions-card.png" alt="Navigation component crop: quick actions card" /><div><strong>Quick actions card</strong><span>Action bundle card with grouped controls or launch points.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/08-notification-card.png" alt="Navigation component crop: notification card" /><div><strong>Notification card</strong><span>Summary card for alerts, inbox, or stateful notices.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/09-command-palette-panel.png" alt="Navigation component crop: command palette panel" /><div><strong>Command palette panel</strong><span>Large framed panel for command search and result selection.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/10-status-list-panel.png" alt="Navigation component crop: status list panel" /><div><strong>Status list panel</strong><span>List panel of routes, modules, or system states.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/11-bottom-sidebar-module.png" alt="Navigation component crop: bottom sidebar module" /><div><strong>Bottom sidebar module</strong><span>Docked lower navigation or profile/status module.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/12-footer-nav-rail.png" alt="Navigation component crop: footer nav rail" /><div><strong>Footer nav rail</strong><span>Bottom navigation strip or secondary route rail.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/13-bottom-command-band.png" alt="Navigation component crop: bottom command band" /><div><strong>Bottom command band</strong><span>Wide lower band for contextual commands or navigation summary.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/14-footer-status-card.png" alt="Navigation component crop: footer status card" /><div><strong>Footer status card</strong><span>Small lower card for state, route, or user context.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/15-header-pill.png" alt="Navigation component crop: header pill" /><div><strong>Header pill control</strong><span>Pill-shaped header indicator or mode selector.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/16-floating-icon-cluster.png" alt="Navigation component crop: floating icon cluster" /><div><strong>Floating icon cluster</strong><span>Compact cluster of small icon affordances or nav markers.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/navigation-components/17-user-profile-dropdown.png" alt="Navigation component crop: user profile dropdown" /><div><strong>User profile dropdown</strong><span>Header identity control with avatar/icon, user name, and expand caret.</span></div></div>
                </div>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-input">
                  <span className="ui-kit-rob-node left" />
                  <span className="ui-kit-rob-node right" />
                  <span className="ui-kit-rob-icon">⌕</span>
                  <span className="ui-kit-rob-placeholder">Search or type a command…</span>
                  <span className="ui-kit-rob-chevron">⌄</span>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Tabs / segmented rail</PanelTitle>
                <a href="/ui-kit-reference/General%20Concepts.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/General%20Concepts.png" alt="Original BRIDGE General Concepts reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> General Concepts<br /><strong>Reference motif:</strong> horizontal shell with inset segments, one selected state, and subtle luminous boundary marks.</BodyMuted>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-tabs">
                  <div className="ui-kit-rob-tab ui-kit-rob-tab-active">Overview</div>
                  <div className="ui-kit-rob-tab">Reports</div>
                  <div className="ui-kit-rob-tab">Settings</div>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Framed info card / panel</PanelTitle>
                <a href="/ui-kit-reference/Interactions.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Interactions.png" alt="Original BRIDGE Interactions reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Interactions<br /><strong>Reference motif:</strong> full card frame with lit seams, content inset, and stronger energy at the corners/junctions than in ordinary cards.</BodyMuted>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-card">
                  <span className="ui-kit-rob-node tl" />
                  <span className="ui-kit-rob-node tr" />
                  <span className="ui-kit-rob-node bl" />
                  <span className="ui-kit-rob-node br" />
                  <div className="ui-kit-rob-card-title">Info Card</div>
                  <div className="ui-kit-rob-card-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="ui-kit-rob-card-chart">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Data table shell</PanelTitle>
                <a href="/ui-kit-reference/Data%20Heavy.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Data%20Heavy.png" alt="Original BRIDGE Data Heavy reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Data Heavy<br /><strong>Reference motif:</strong> framed table with luminous column separators, hard header band, and an outer shell that feels like an instrument display.</BodyMuted>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-table">
                  <div className="ui-kit-rob-table-head">
                    <span>ID</span><span>Status</span><span>Date</span><span>Action</span>
                  </div>
                  <div className="ui-kit-rob-table-row">
                    <span>001</span><span>Active</span><span>02/12/23</span><span>Edit</span>
                  </div>
                  <div className="ui-kit-rob-table-row">
                    <span>002</span><span>Pending</span><span>03/08/23</span><span>Edit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Dashboard metric tile</PanelTitle>
                <a href="/ui-kit-reference/Dashboard.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Dashboard.png" alt="Original BRIDGE Dashboard reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Dashboard<br /><strong>Reference motif:</strong> compact dashboard tile with a framed shell, elevated metric readout, and a small chart or status strip nested inside.</BodyMuted>
                <div className="ui-kit-component-crops">
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/01-stat-users.png" alt="Dashboard component crop: users metric stat card" /><div><strong>Users metric card</strong><span>Top-line KPI tile for total users.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/04-stat-alert.png" alt="Dashboard component crop: alert status card" /><div><strong>Alert status card</strong><span>Critical summary tile for highlighted incidents.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/05-radial-processing.png" alt="Dashboard component crop: radial processing gauge" /><div><strong>Radial processing gauge</strong><span>Hero circular progress widget with central percentage.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/06-system-status.png" alt="Dashboard component crop: system status list" /><div><strong>System status list</strong><span>Semantic list of online, warning, and critical states.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/07-top-line-chart.png" alt="Dashboard component crop: top trend chart" /><div><strong>Trend line chart</strong><span>Time-series panel for live performance movement.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/08-radar-panel-left.png" alt="Dashboard component crop: large radar panel" /><div><strong>Radar scan panel</strong><span>Large tactical visualization with polar grid and target sweep.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/09-bar-chart.png" alt="Dashboard component crop: bar chart panel" /><div><strong>Bar chart panel</strong><span>Histogram-like quantitative comparison surface.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/10-timeline-strip.png" alt="Dashboard component crop: timeline strip" /><div><strong>Timeline strip</strong><span>Compact event progression rail with markers.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/11-donut-progress.png" alt="Dashboard component crop: donut progress chart" /><div><strong>Donut progress chart</strong><span>Segmented circular metric with multi-band status wedges.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/12-task-queue.png" alt="Dashboard component crop: task queue panel" /><div><strong>Task queue panel</strong><span>Stacked work-item list with per-row status indicators.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/13-activity-strip.png" alt="Dashboard component crop: horizontal activity strip" /><div><strong>Activity strip</strong><span>Long horizontal telemetry rail with inline markers.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/14-activity-feed.png" alt="Dashboard component crop: activity feed panel" /><div><strong>Activity feed</strong><span>Event list for recent operational updates.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/15-versus-comparison.png" alt="Dashboard component crop: versus comparison panel" /><div><strong>Versus comparison card</strong><span>Head-to-head dual-metric comparator with central emblem.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/16-radar-panel-right.png" alt="Dashboard component crop: right radar panel" /><div><strong>Target radar panel</strong><span>Secondary circular target-tracking visualization.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/17-map-panel.png" alt="Dashboard component crop: map diagnostics panel" /><div><strong>Map diagnostics panel</strong><span>Hybrid map and systems layout with layered overlays.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/18-system-overview.png" alt="Dashboard component crop: system overview panel" /><div><strong>System overview panel</strong><span>Grouped mini-metric cards inside a framed summary band.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/19-anomaly-alert.png" alt="Dashboard component crop: anomaly alert panel" /><div><strong>Anomaly alert panel</strong><span>Semantic callout card for deviation warnings.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/20-diagnostics.png" alt="Dashboard component crop: diagnostics status list" /><div><strong>Diagnostics status panel</strong><span>State matrix for nominal, warning, and critical health.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/21-mini-map.png" alt="Dashboard component crop: mini map panel" /><div><strong>Mini map panel</strong><span>Compressed navigation/minimap widget with status inset.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/22-small-radar-widget.png" alt="Dashboard component crop: small radar widget" /><div><strong>Micro radar widget</strong><span>Small circular locator or ping-status ornament.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/23-bottom-area-chart.png" alt="Dashboard component crop: bottom area chart" /><div><strong>Area chart panel</strong><span>Low-profile time-series surface with filled trend region.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/dashboard-components/24-radial-operational.png" alt="Dashboard component crop: operational radial gauge" /><div><strong>Operational radial gauge</strong><span>Bottom hero circular metric for system operational status.</span></div></div>
                </div>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-metric">
                  <div className="ui-kit-rob-kicker">System Load</div>
                  <div className="ui-kit-rob-metric-value">84%</div>
                  <div className="ui-kit-rob-metric-bars"><span /><span /><span /><span /><span /></div>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Icon frame / glyph housing</PanelTitle>
                <a href="/ui-kit-reference/Icons.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Icons.png" alt="Original BRIDGE Icons reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Icons<br /><strong>Reference motif:</strong> geometric icon housings with circular and squared frames, luminous inner strokes, and restrained technical ornament.</BodyMuted>
                <div className="ui-kit-component-crops">
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/01-search-icon-frame.png" alt="Icons component crop: search icon frame" /><div><strong>Search icon frame</strong><span>Magnifier glyph in a framed technical housing.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/02-target-icon-frame.png" alt="Icons component crop: target icon frame" /><div><strong>Target icon frame</strong><span>Targeting/locator glyph with circular frame treatment.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/03-wave-icon-frame.png" alt="Icons component crop: wave icon frame" /><div><strong>Wave icon frame</strong><span>Signal or telemetry glyph inside a technical shell.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/04-grid-icon-frame.png" alt="Icons component crop: grid icon frame" /><div><strong>Grid icon frame</strong><span>Grid/module glyph suitable for dashboards and launchers.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/05-shield-icon-frame.png" alt="Icons component crop: shield icon frame" /><div><strong>Shield icon frame</strong><span>Security/protection glyph inside a framed housing.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/06-orbit-icon-frame.png" alt="Icons component crop: orbit icon frame" /><div><strong>Orbit icon frame</strong><span>Orbital/system-network glyph with circular motion cues.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/07-alert-icon-frame.png" alt="Icons component crop: alert icon frame" /><div><strong>Alert icon frame</strong><span>Warning/attention glyph in a stronger framed shell.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/08-system-icons-row.png" alt="Icons component crop: system icons row" /><div><strong>System icons</strong><span>Core app and object glyphs: home, search, folders, settings, profile, and favorites.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/09-navigation-icons-row.png" alt="Icons component crop: navigation icons row" /><div><strong>Navigation icons</strong><span>Directional, location, and route glyphs for menus and movement.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/10-status-alert-icons-row.png" alt="Icons component crop: status and alert icons row" /><div><strong>Status &amp; alert icons</strong><span>Checks, warnings, dismiss states, and semantic alert markers.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/11-cursors-reticles.png" alt="Icons component crop: cursors and reticles" /><div><strong>Cursors &amp; reticles</strong><span>Targeting, cursor, and focus reticle studies.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/12-dividers-badges.png" alt="Icons component crop: dividers and badges" /><div><strong>Dividers &amp; badges</strong><span>Decorative dividers, live/new badges, and small label shells.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/13-loaders-progress-top.png" alt="Icons component crop: loaders and progress top" /><div><strong>Loaders &amp; progress A</strong><span>Compact circular progress and loader ring treatments.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/14-indicators-pills.png" alt="Icons component crop: indicators and pills" /><div><strong>Indicators &amp; pills</strong><span>Status dots, small chips, and on/off label treatments.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/15-loaders-progress-bottom.png" alt="Icons component crop: loaders and progress bottom" /><div><strong>Loaders &amp; progress B</strong><span>Larger ring-based progress studies and multi-state circular loaders.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/16-corners-brackets.png" alt="Icons component crop: corners and brackets" /><div><strong>Corners &amp; brackets</strong><span>Frame-corner, notch, and bracket studies used as structural accent language.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/17-handles-grips.png" alt="Icons component crop: handles and grips" /><div><strong>Handles &amp; grips</strong><span>Drag handles, rails, grips, and tiny chrome controls.</span></div></div>
                  <div className="ui-kit-component-crop"><img src="/ui-kit-reference/icons-components/18-radial-controls.png" alt="Icons component crop: radial controls" /><div><strong>Radial controls</strong><span>Knob-like circular controls with center marks and active arcs.</span></div></div>
                </div>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-iconset">
                  <div className="ui-kit-rob-icon-frame">⌕</div>
                  <div className="ui-kit-rob-icon-frame">◎</div>
                  <div className="ui-kit-rob-icon-frame">⌁</div>
                </div>
              </div>
            </div>

            <div className="ui-kit-compare-card">
              <div className="ui-kit-compare-source">
                <Kicker>Reference</Kicker>
                <PanelTitle>Transient status shell</PanelTitle>
                <a href="/ui-kit-reference/Transient%20States%20Concept.png" target="_blank" rel="noreferrer">
                  <img className="ui-kit-reference-image" src="/ui-kit-reference/Transient%20States%20Concept.png" alt="Original BRIDGE Transient States Concept reference board" />
                </a>
                <BodyMuted><strong>Source board:</strong> Transient States Concept<br /><strong>Reference motif:</strong> alert and transient panels with brighter semantic edges, framed banners, and state-specific visual emphasis.</BodyMuted>
              </div>
              <div className="ui-kit-compare-build">
                <Kicker>Component study</Kicker>
                <div className="ui-kit-rob-demo ui-kit-rob-transient">
                  <div className="ui-kit-rob-transient-title">Warning State</div>
                  <div className="ui-kit-rob-transient-copy">Configuration drift detected in one monitored component.</div>
                </div>
              </div>
            </div>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid two-col">
        <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
          <PanelHeader>
            <div>
              <Kicker>Foundations</Kicker>
              <PanelTitle>Typography hierarchy</PanelTitle>
              <BodyMuted>Type should read like a public token layer: clear section titles, compact metadata, and restrained body copy that supports technical content without looking sterile.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div>
              <Kicker>Section kicker</Kicker>
              <SectionTitle>Section Title</SectionTitle>
              <PanelTitle>Panel Title</PanelTitle>
              <BodyMuted>Muted body copy should feel technical, calm, and slightly compressed rather than generic SaaS helper text.</BodyMuted>
            </div>
            <div className="grid two-col">
              <div>
                <MetaLabel>Meta label</MetaLabel>
                <MetaValue>Context window / 128k</MetaValue>
              </div>
              <div>
                <MetaLabel>Metric</MetaLabel>
                <MetricValue>14,382</MetricValue>
              </div>
            </div>
          </PanelBody>
        </Panel>

        <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
          <PanelHeader>
            <div>
              <Kicker>Corners & brackets system</Kicker>
              <PanelTitle>Role-based bracket taxonomy</PanelTitle>
              <BodyMuted>The source language only works if brackets are assigned specific jobs. This pass organizes them by role: structural corners, header cues, focus cues, annotations, and frame accents. The point is not to use more brackets — it is to use the right bracket in the right place.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="grid two-col">
              <PanelSection className="ds-panel-section-dense ui-kit-bracket-role-card">
                <Kicker>Primary frame logic</Kicker>
                <PanelTitle>Continuous rails with lit junctions</PanelTitle>
                <BodyMuted>The originals are mostly not loose corner glyphs. They are thin rectangular or partial frames, then intensified with bright joints and seam flares.</BodyMuted>
                <div className="ui-kit-bracket-grid">
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-frame-outline ui-kit-frame-tone-structural">
                      <span className="ui-kit-frame-node tl" />
                      <span className="ui-kit-frame-node tr" />
                      <span className="ui-kit-frame-node bl" />
                      <span className="ui-kit-frame-node br" />
                    </div>
                    <MetaLabel>Full frame / node-lit</MetaLabel>
                  </div>
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-frame-inset ui-kit-frame-tone-structural">
                      <span className="ui-kit-frame-node mid-top" />
                      <span className="ui-kit-frame-node mid-bottom" />
                    </div>
                    <MetaLabel>Inset frame / rail emphasis</MetaLabel>
                  </div>
                </div>
              </PanelSection>

              <PanelSection className="ds-panel-section-dense ui-kit-bracket-role-card">
                <Kicker>Section entry logic</Kicker>
                <PanelTitle>Header rails and entry joints</PanelTitle>
                <BodyMuted>Headers in the source feel like line systems entering a section, often with a bright point or short hard turn rather than a decorative bracket stamp.</BodyMuted>
                <div className="ui-kit-bracket-grid">
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-header-rail-left ui-kit-frame-tone-header">
                      <span className="ui-kit-rail-line" />
                      <span className="ui-kit-rail-joint" />
                    </div>
                    <MetaLabel>Header rail / left entry</MetaLabel>
                  </div>
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-header-rail-right ui-kit-frame-tone-header">
                      <span className="ui-kit-rail-line" />
                      <span className="ui-kit-rail-joint" />
                    </div>
                    <MetaLabel>Header rail / right entry</MetaLabel>
                  </div>
                </div>
              </PanelSection>

              <PanelSection className="ds-panel-section-dense ui-kit-bracket-role-card">
                <Kicker>Selection logic</Kicker>
                <PanelTitle>Focus frame with edge flares</PanelTitle>
                <BodyMuted>Selected states use a brighter perimeter with a few hot points. It is more like a charged frame than four detached corners.</BodyMuted>
                <div className="ui-kit-bracket-grid ui-kit-bracket-grid-single">
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-frame-focus ui-kit-frame-tone-focus">
                      <span className="ui-kit-frame-node tl" />
                      <span className="ui-kit-frame-node tr" />
                      <span className="ui-kit-frame-node bl" />
                      <span className="ui-kit-frame-node br" />
                      <span className="ui-kit-frame-node mid-left" />
                      <span className="ui-kit-frame-node mid-right" />
                    </div>
                    <MetaLabel>Focus frame / energized perimeter</MetaLabel>
                  </div>
                </div>
              </PanelSection>

              <PanelSection className="ds-panel-section-dense ui-kit-bracket-role-card">
                <Kicker>Secondary accents</Kicker>
                <PanelTitle>Notches, side markers, and segmented rails</PanelTitle>
                <BodyMuted>These exist in the originals, but as support details. They should sit under the main frame logic, not replace it.</BodyMuted>
                <div className="ui-kit-bracket-grid">
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-frame-side-marker ui-kit-frame-tone-annotation">
                      <span className="ui-kit-side-bracket" />
                      <span className="ui-kit-frame-node mid-left" />
                    </div>
                    <MetaLabel>Side marker / row accent</MetaLabel>
                  </div>
                  <div className="ui-kit-bracket-card">
                    <div className="ui-kit-bracket-box ui-kit-frame-notch-rail ui-kit-frame-tone-frame">
                      <span className="ui-kit-notch-bracket" />
                      <span className="ui-kit-frame-segment" />
                    </div>
                    <MetaLabel>Notch + segmented rail</MetaLabel>
                  </div>
                </div>
              </PanelSection>
            </div>

            <Alert>
              The biggest correction from the source boards: corners are usually a byproduct of a frame system, not isolated ornaments. If a treatment can’t be explained as a rail, seam, node, or frame interruption, it’s probably not faithful enough.
            </Alert>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid two-col">
        <Panel variant="interactive" className="ui-kit-panel-shell ui-kit-panel-shell-interactive">
          <PanelHeader>
            <div>
              <Kicker>Components / Actions</Kicker>
              <PanelTitle>Button family</PanelTitle>
              <BodyMuted>Action controls should now read like a public library family: one core chassis, variant-specific emphasis, and compact label treatments that stay consistent across the system.</BodyMuted>
            </div>
          </PanelHeader>
          <PanelBody className="stack">
            <div className="row wrap">
              <Button variant="primary">Primary action</Button>
              <Button variant="secondary">Secondary action</Button>
              <Button variant="ghost">Ghost action</Button>
              <Button variant="danger">Danger action</Button>
            </div>
            <div className="grid two-col">
              <PanelSection className="ds-panel-section-dense">
                <Kicker>Label study A</Kicker>
                <BodyMuted>Smaller and tighter than the current baseline.</BodyMuted>
                <div className="row wrap">
                  <Button variant="secondary" labelStyle="a">Primary action</Button>
                </div>
              </PanelSection>
              <PanelSection className="ds-panel-section-dense">
                <Kicker>Label study B</Kicker>
                <BodyMuted>Heavier and more condensed-feeling.</BodyMuted>
                <div className="row wrap">
                  <Button variant="secondary" labelStyle="b">Primary action</Button>
                </div>
              </PanelSection>
              <PanelSection className="ds-panel-section-dense">
                <Kicker>Label study C</Kicker>
                <BodyMuted>Narrower spacing and slightly more technical density.</BodyMuted>
                <div className="row wrap">
                  <Button variant="secondary" labelStyle="c">Primary action</Button>
                </div>
              </PanelSection>
              <PanelSection className="ds-panel-section-dense">
                <Kicker>Label study D</Kicker>
                <BodyMuted>Less airy, more compact control marking.</BodyMuted>
                <div className="row wrap">
                  <Button variant="secondary" labelStyle="d">Primary action</Button>
                </div>
              </PanelSection>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel variant="inspector" className="ui-kit-panel-shell ui-kit-panel-shell-inspector">
        <PanelHeader>
          <div>
            <Kicker>Components / Surfaces</Kicker>
            <PanelTitle>Surface archetypes</PanelTitle>
            <BodyMuted>Panels should be documented as a small public family — default, interactive, metric, and dense — rather than a single generic card style stretched across every feature.</BodyMuted>
          </div>
        </PanelHeader>
        <PanelBody className="grid ui-kit-panel-grid">
          <PanelSection>
            <Kicker>Default</Kicker>
            <PanelTitle>Panel / Default</PanelTitle>
            <BodyMuted>General content container for page sections, forms, and summaries.</BodyMuted>
          </PanelSection>
          <PanelSection className="ds-panel-section-interactive">
            <Kicker>Interactive</Kicker>
            <PanelTitle>Panel / Interactive</PanelTitle>
            <BodyMuted>For launch cards, high-intent selections, and action-led modules.</BodyMuted>
          </PanelSection>
          <PanelSection className="ds-panel-section-metric">
            <Kicker>Metric</Kicker>
            <PanelTitle>Panel / Metric</PanelTitle>
            <MetricValue>98.2%</MetricValue>
            <BodyMuted>Compact status/metric display with stronger emphasis and tighter density.</BodyMuted>
          </PanelSection>
          <PanelSection className="ds-panel-section-dense">
            <Kicker>Dense</Kicker>
            <PanelTitle>Panel / Dense</PanelTitle>
            <BodyMuted>For settings rows, inspectors, and tightly grouped metadata.</BodyMuted>
          </PanelSection>
        </PanelBody>
      </Panel>

      <div className="grid two-col">
        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Forms / Fields</h3>
          <Input label="Dataset name" placeholder="Bridge telemetry archive" hint="Single-line text input with technical label styling." />
          <Select label="Provider" defaultValue="openai-compatible" hint="Selects should feel like instrument controls, not browser defaults.">
            <option value="openai-compatible">OpenAI compatible</option>
            <option value="ollama">Ollama</option>
            <option value="mock">Mock provider</option>
          </Select>
          <Textarea label="System prompt" rows={4} placeholder="You are reviewing a dataset-linked conversation..." hint="Textarea should share the same chassis and focus language as the input." />
        </PanelBody></Panel>

        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Checkbox / Toggle rows</h3>
          <CheckboxRow label="Stream responses" hint="Use this for chat/session settings style toggles." defaultChecked />
          <CheckboxRow label="Enable local dev bypass" hint="This should align with auth/settings toggles." />
          <div className="muted">These should replace ad hoc checkbox-row patterns in Chat and Settings.</div>
        </PanelBody></Panel>
      </div>

      <div className="grid two-col">
        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Feedback / Status</h3>
          <div className="row wrap">
            <Badge>Neutral</Badge>
            <Badge variant="info">Linked dataset</Badge>
            <Badge variant="success">Ready</Badge>
            <Badge variant="warning">Requires review</Badge>
            <Badge variant="danger">Error</Badge>
          </div>
          <div className="muted">These should eventually replace ad hoc pills used throughout Chat, Datasets, Workflows, and Imports.</div>
        </PanelBody></Panel>

        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Data Display / Table</h3>
          <div className="muted">Reusable tabular inspection surface for datasets, imports, and admin pages.</div>
          <DataTable
            compact
            columns={['Column', 'Type', 'Sample']}
            rows={[
              ['city', 'string', 'New York'],
              ['temperature', 'number', '72.4'],
              ['captured_at', 'datetime', '2026-03-27T19:45:00Z'],
            ]}
          />
        </PanelBody></Panel>
      </div>

      <div className="grid two-col">
        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Alerts</h3>
          <Alert>Default informational alert / notice.</Alert>
          <Alert variant="success">Success alert for completed operations.</Alert>
          <Alert variant="error">Error alert for failures or destructive warnings.</Alert>
        </PanelBody></Panel>

        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Popover</h3>
          <div className="muted">Anchored menu pattern for lightweight local actions.</div>
          <div className="row wrap">
            <div ref={anchorRef} className="session-menu-anchor">
              <Button type="button" variant="secondary" onClick={() => setShowPopover((current) => !current)}>Toggle sample popover</Button>
              <Popover open={showPopover} anchorRef={anchorRef}>
                <PopoverItem>Rename</PopoverItem>
                <PopoverItem>Edit settings</PopoverItem>
                <PopoverItem>Export</PopoverItem>
                <PopoverItem danger>Delete</PopoverItem>
              </Popover>
            </div>
          </div>
        </PanelBody></Panel>
      </div>

      <div className="grid two-col">
        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>KeyValueGrid</h3>
          <div className="muted">Structured metadata display for summaries, configs, and run details.</div>
          <KeyValueGrid
            items={[
              { label: 'Updated', value: '2026-03-27 19:40 EDT' },
              { label: 'Rows', value: '14,382' },
              { label: 'Media type', value: 'text/csv' },
              { label: 'Source ref', value: 'https://example.internal/data/bridge/telemetry/export/latest.csv' },
            ]}
          />
        </PanelBody></Panel>

        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>EmptyState</h3>
          <div className="muted">Reusable no-data / no-selection pattern.</div>
          <EmptyState
            title="No dataset selected"
            description="Choose a dataset to inspect it, or upload a file to create one directly."
            action={<Button variant="primary">Upload file</Button>}
          />
        </PanelBody></Panel>
      </div>

      <div className="grid two-col">
        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Icon Buttons</h3>
          <div className="muted">Compact utility actions for chrome, toolbars, and row actions.</div>
          <div className="row wrap">
            <IconButton label="Search">⌕</IconButton>
            <IconButton label="More actions" variant="ghost">⋯</IconButton>
            <IconButton label="Delete" variant="danger">×</IconButton>
          </div>
        </PanelBody></Panel>

        <Panel className="ui-kit-panel-shell ui-kit-panel-shell-quiet"><PanelBody className="stack">
          <h3>Modal: Standard</h3>
          <div className="muted">General editing/configuration modal.</div>
          <div className="row wrap">
            <Button type="button" variant="primary" onClick={() => setShowModal(true)}>Open standard modal</Button>
            <Button type="button" variant="danger" onClick={() => setShowDeleteModal(true)}>Open delete modal</Button>
          </div>
        </PanelBody></Panel>
      </div>

      <Panel className="ui-kit-panel-shell ui-kit-panel-shell-inspector"><PanelBody className="stack">
        <h3>Recommended next primitives</h3>
        <ul className="list compact-list">
          <li><strong>Surface-to-feature migration</strong> — migrate carefully after UI Kit approval.</li>
          <li><strong>Shared table actions / toolbar patterns</strong> — likely useful after DataTable starts appearing in features.</li>
          <li><strong>CheckboxRow vs Switch decision</strong> — decide whether BRIDGE wants both or only one boolean-control pattern.</li>
        </ul>
      </PanelBody></Panel>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Standard modal example"
        footer={
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="button" variant="primary" onClick={() => setShowModal(false)}>Save changes</Button>
          </div>
        }
      >
        <Input label="Example input" placeholder="Example text input" />
        <Select label="Example select" defaultValue="chat">
          <option value="chat">Chat</option>
          <option value="workbench">Workbench</option>
          <option value="workflow">Workflow</option>
        </Select>
        <Textarea label="Example textarea" rows={4} placeholder="Example textarea" />
        <Alert>This shows how alerts can live inside modal content too.</Alert>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete example item?"
        size="sm"
        footer={
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button type="button" variant="danger" onClick={() => setShowDeleteModal(false)}>Delete item</Button>
          </div>
        }
      >
        <div className="muted">Use this compact confirmation pattern for destructive actions that should match the rest of the app UI.</div>
      </Modal>
    </div>
  );
}
