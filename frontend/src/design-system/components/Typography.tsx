import type { HTMLAttributes, ReactNode } from 'react';

type TextProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

export function Kicker({ children, className = '', ...props }: TextProps) {
  return <div {...props} className={`ds-kicker ${className}`.trim()}>{children}</div>;
}

export function PanelTitle({ children, className = '', ...props }: TextProps) {
  return <h3 {...props} className={`ds-panel-title ${className}`.trim()}>{children}</h3>;
}

export function SectionTitle({ children, className = '', ...props }: TextProps) {
  return <h2 {...props} className={`ds-section-title ${className}`.trim()}>{children}</h2>;
}

export function FieldLabel({ children, className = '', ...props }: TextProps) {
  return <span {...props} className={`ds-field-label ${className}`.trim()}>{children}</span>;
}

export function MetaLabel({ children, className = '', ...props }: TextProps) {
  return <div {...props} className={`ds-meta-label ${className}`.trim()}>{children}</div>;
}

export function MetaValue({ children, className = '', ...props }: TextProps) {
  return <div {...props} className={`ds-meta-value ${className}`.trim()}>{children}</div>;
}

export function BodyMuted({ children, className = '', ...props }: TextProps) {
  return <div {...props} className={`ds-body-muted ${className}`.trim()}>{children}</div>;
}

export function MetricValue({ children, className = '', ...props }: TextProps) {
  return <div {...props} className={`ds-metric-value ${className}`.trim()}>{children}</div>;
}
