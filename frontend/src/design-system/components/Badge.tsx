import type { HTMLAttributes, ReactNode } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
};

export function Badge({ variant = 'neutral', className = '', children, ...props }: BadgeProps) {
  const variantClass =
    variant === 'info'
      ? 'ds-badge ds-badge-info'
      : variant === 'success'
        ? 'ds-badge ds-badge-success'
        : variant === 'warning'
          ? 'ds-badge ds-badge-warning'
          : variant === 'danger'
            ? 'ds-badge ds-badge-danger'
            : 'ds-badge';
  return <span {...props} className={`${variantClass} ${className}`.trim()}>{children}</span>;
}
