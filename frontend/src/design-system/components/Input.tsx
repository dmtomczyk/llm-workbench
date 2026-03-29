import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({ label, hint, className = '', ...props }: InputProps) {
  return (
    <label className="ds-field">
      {label ? <span className="ds-field-label">{label}</span> : null}
      <input {...props} className={`ds-input ${className}`.trim()} />
      {hint ? <span className="ds-field-hint">{hint}</span> : null}
    </label>
  );
}
