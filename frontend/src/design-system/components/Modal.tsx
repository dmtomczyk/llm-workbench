import type { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  if (!open) return null;
  const sizeClass = size === 'sm' ? 'modal-card modal-card-sm' : size === 'lg' ? 'modal-card modal-card-lg' : 'modal-card';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={sizeClass} onClick={(event) => event.stopPropagation()}>
        {title ? (
          <div className="row between wrap">
            <h2>{title}</h2>
            <button type="button" className="ds-modal-close" onClick={onClose}>Close</button>
          </div>
        ) : null}
        <div className="stack">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
