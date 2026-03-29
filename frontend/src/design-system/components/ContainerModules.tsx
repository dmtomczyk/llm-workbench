import type { HTMLAttributes, ReactNode } from 'react';

import { Badge } from './Badge';
import { Panel, PanelBody, PanelHeader, PanelSection } from './Panel';
import { Kicker, MetaLabel, MetaValue, PanelTitle } from './Typography';

type ModulePanelProps = HTMLAttributes<HTMLDivElement> & {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: 'default' | 'interactive' | 'metric' | 'inspector' | 'dense';
};

export function ModulePanel({ kicker, title, description, actions, variant = 'interactive', className = '', children, ...props }: ModulePanelProps) {
  return (
    <Panel {...props} variant={variant} className={`ui-kit-panel-shell ${variant === 'interactive' ? 'ui-kit-panel-shell-interactive' : variant === 'inspector' ? 'ui-kit-panel-shell-inspector' : variant === 'dense' ? 'ui-kit-panel-shell-quiet' : ''} ${className}`.trim()}>
      <PanelHeader>
        <div>
          {kicker ? <Kicker>{kicker}</Kicker> : null}
          <PanelTitle>{title}</PanelTitle>
          {description ? <div className="ds-body-muted">{description}</div> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </PanelHeader>
      <PanelBody>{children}</PanelBody>
    </Panel>
  );
}

type MetricModuleProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  status?: ReactNode;
  detail?: ReactNode;
};

export function MetricModule({ label, value, status, detail, className = '', ...props }: MetricModuleProps) {
  return (
    <Panel {...props} variant="metric" className={`ui-kit-panel-shell ui-kit-panel-shell-interactive ${className}`.trim()}>
      <PanelBody className="stack">
        <MetaLabel>{label}</MetaLabel>
        <div className="ds-metric-value">{value}</div>
        {status ? <div>{status}</div> : null}
        {detail ? <div className="ds-body-muted">{detail}</div> : null}
      </PanelBody>
    </Panel>
  );
}

type ToolbarModuleProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  actions: ReactNode;
  meta?: ReactNode;
};

export function ToolbarModule({ title, actions, meta, className = '', ...props }: ToolbarModuleProps) {
  return (
    <Panel {...props} variant="dense" className={`ui-kit-panel-shell ui-kit-panel-shell-quiet ${className}`.trim()}>
      <PanelBody className="stack">
        <div className="row items-center justify-between gap-sm">
          <PanelTitle>{title}</PanelTitle>
          {meta ? <Badge variant="info">{meta}</Badge> : null}
        </div>
        <PanelSection className="ds-panel-section-dense">
          <div className="row wrap">{actions}</div>
        </PanelSection>
      </PanelBody>
    </Panel>
  );
}

type InfoModuleProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
};

export function InfoModule({ label, value, note, className = '', ...props }: InfoModuleProps) {
  return (
    <Panel {...props} variant="inspector" className={`ui-kit-panel-shell ui-kit-panel-shell-inspector ${className}`.trim()}>
      <PanelBody className="stack">
        <MetaLabel>{label}</MetaLabel>
        <MetaValue>{value}</MetaValue>
        {note ? <div className="ds-body-muted">{note}</div> : null}
      </PanelBody>
    </Panel>
  );
}
