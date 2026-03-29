import type { ReactNode, SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  children: ReactNode;
};

export function Select({ label, hint, className = '', children, ...props }: SelectProps) {
  return (
    <label className="ds-field">
      {label ? <span className="ds-field-label">{label}</span> : null}
      <div className="ds-select-wrap">
        <select {...props} className={`ds-select ${className}`.trim()}>
          {children}
        </select>
        <span className="ds-select-chevron" aria-hidden="true">⌄</span>
      </div>
      {hint ? <span className="ds-field-hint">{hint}</span> : null}
    </label>
  );
}
