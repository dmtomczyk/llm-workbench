import type { HTMLAttributes, ReactNode } from 'react';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'interactive' | 'elevated' | 'subtle';
  children: ReactNode;
};

export function Surface({ variant = 'default', className = '', children, ...props }: SurfaceProps) {
  const variantClass =
    variant === 'interactive'
      ? 'ds-surface ds-surface-interactive'
      : variant === 'elevated'
        ? 'ds-surface ds-surface-elevated'
        : variant === 'subtle'
          ? 'ds-surface ds-surface-subtle'
          : 'ds-surface';
  return (
    <div {...props} className={`${variantClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
