import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';

type PopoverProps = {
  open: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
};

type PopoverItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  danger?: boolean;
  children: ReactNode;
};

export function Popover({ open, children, className = '' }: PopoverProps) {
  if (!open) return null;
  return <div className={`session-popover-menu ds-popover ${className}`.trim()}>{children}</div>;
}

export function PopoverItem({ danger = false, className = '', children, ...props }: PopoverItemProps) {
  return <button {...props} className={`${danger ? 'ds-popover-item ds-popover-item-danger' : 'ds-popover-item'} ${className}`.trim()}>{children}</button>;
}
