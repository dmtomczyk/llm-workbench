import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export function Textarea({ label, hint, className = '', ...props }: TextareaProps) {
  return (
    <label className="ds-field">
      {label ? <span className="ds-field-label">{label}</span> : null}
      <textarea {...props} className={`ds-textarea ${className}`.trim()} />
      {hint ? <span className="ds-field-hint">{hint}</span> : null}
    </label>
  );
}
