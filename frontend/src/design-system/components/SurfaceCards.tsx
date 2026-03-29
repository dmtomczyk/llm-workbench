import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import { PanelTitle } from './Typography';

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
};

export function SurfaceCard({ eyebrow, title, description, media, actions, className = '', children, ...props }: SurfaceCardProps) {
  return (
    <div {...props} className={`ds-surface-card ${className}`.trim()}>
      {media ? <div className="ds-surface-card-media">{media}</div> : null}
      <div className="ds-surface-card-body">
        {eyebrow ? <div className="ds-surface-card-eyebrow">{eyebrow}</div> : null}
        {title ? <PanelTitle>{title}</PanelTitle> : null}
        {description ? <div className="ds-surface-card-description">{description}</div> : null}
        {children}
      </div>
      {actions ? <div className="ds-surface-card-actions">{actions}</div> : null}
    </div>
  );
}

type MetricCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  trend?: ReactNode;
  footer?: ReactNode;
};

export function MetricCard({ label, value, trend, footer, className = '', ...props }: MetricCardProps) {
  return (
    <div {...props} className={`ds-metric-card ${className}`.trim()}>
      <div className="ds-metric-card-label">{label}</div>
      <div className="ds-metric-card-value">{value}</div>
      {trend ? <div className="ds-metric-card-trend">{trend}</div> : null}
      {footer ? <div className="ds-metric-card-footer">{footer}</div> : null}
    </div>
  );
}

type ActionCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
};

export function ActionCard({ icon, title, description, meta, className = '', ...props }: ActionCardProps) {
  return (
    <button {...props} className={`ds-action-card ${className}`.trim()}>
      <span className="ds-action-card-icon">{icon}</span>
      <span className="ds-action-card-copy">
        <span className="ds-action-card-title">{title}</span>
        {description ? <span className="ds-action-card-description">{description}</span> : null}
      </span>
      {meta ? <span className="ds-action-card-meta">{meta}</span> : null}
    </button>
  );
}
