import type { HTMLAttributes, ReactNode } from 'react';

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'interactive' | 'metric' | 'inspector' | 'dense';
  children: ReactNode;
};

export function Panel({ variant = 'default', className = '', children, ...props }: PanelProps) {
  const variantClass =
    variant === 'interactive'
      ? 'ds-panel ds-panel-interactive'
      : variant === 'metric'
        ? 'ds-panel ds-panel-metric'
        : variant === 'inspector'
          ? 'ds-panel ds-panel-inspector'
          : variant === 'dense'
            ? 'ds-panel ds-panel-dense'
            : 'ds-panel';
  return (
    <div {...props} className={`${variantClass} ${className}`.trim()}>
      <span className="ds-panel-frame" aria-hidden="true">
        <span className="ds-panel-corner ds-panel-corner-tl" />
        <span className="ds-panel-corner ds-panel-corner-tr" />
        <span className="ds-panel-corner ds-panel-corner-bl" />
        <span className="ds-panel-corner ds-panel-corner-br" />
      </span>
      {children}
    </div>
  );
}

export function PanelHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`ds-panel-header ${className}`.trim()}>
      <span className="ds-panel-header-rail" aria-hidden="true" />
      {children}
    </div>
  );
}

export function PanelBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`ds-panel-body ${className}`.trim()}>{children}</div>;
}

export function PanelSection({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`ds-panel-section ${className}`.trim()}>{children}</div>;
}
