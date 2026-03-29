import type { ReactNode } from 'react';

type AlertProps = {
  variant?: 'info' | 'success' | 'error';
  children: ReactNode;
  className?: string;
};

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  const variantClass = variant === 'success' ? 'notice success' : variant === 'error' ? 'notice error' : 'notice';
  return <div className={`${variantClass} ${className}`.trim()}>{children}</div>;
}
