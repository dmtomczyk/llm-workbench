import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: 'secondary' | 'ghost' | 'danger';
};

export function IconButton({ label, children, variant = 'secondary', className = '', ...props }: IconButtonProps) {
  const variantClass = variant === 'ghost' ? 'ds-icon-button ds-icon-button-ghost' : variant === 'danger' ? 'ds-icon-button ds-icon-button-danger' : 'ds-icon-button';
  return (
    <button {...props} className={`${variantClass} ${className}`.trim()} aria-label={label} title={label}>
      {children}
    </button>
  );
}
