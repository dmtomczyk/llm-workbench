import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  labelStyle?: 'default' | 'a' | 'b' | 'c' | 'd';
  children: ReactNode;
};

export function Button({ variant = 'secondary', labelStyle = 'default', className = '', children, ...props }: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'ds-button ds-button-primary'
      : variant === 'ghost'
        ? 'ds-button ds-button-ghost'
        : variant === 'danger'
          ? 'ds-button ds-button-danger'
          : 'ds-button ds-button-secondary';
  return (
    <button {...props} className={`${variantClass} ${className}`.trim()}>
      <span className="ds-button-frame" aria-hidden="true">
        <span className="ds-button-corner ds-button-corner-tl" />
        <span className="ds-button-corner ds-button-corner-tr" />
        <span className="ds-button-corner ds-button-corner-bl" />
        <span className="ds-button-corner ds-button-corner-br" />
      </span>
      <span className="ds-button-inner">
        <span className={`ds-button-label ds-button-label-${labelStyle}`}>{children}</span>
      </span>
    </button>
  );
}
