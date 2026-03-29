import type { InputHTMLAttributes } from 'react';

type CheckboxRowProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  hint?: string;
};

export function CheckboxRow({ label, hint, className = '', ...props }: CheckboxRowProps) {
  return (
    <label className={`ds-checkbox-row ${className}`.trim()}>
      <span className="ds-checkbox-control-wrap">
        <input {...props} type="checkbox" className="ds-checkbox-input" />
        <span className="ds-checkbox-control" aria-hidden="true">
          <span className="ds-checkbox-indicator" />
        </span>
      </span>
      <span className="ds-checkbox-copy">
        <span className="ds-checkbox-label">{label}</span>
        {hint ? <span className="ds-checkbox-hint">{hint}</span> : null}
      </span>
    </label>
  );
}
