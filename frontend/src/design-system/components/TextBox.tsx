import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

type TextBoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> & {
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
};

export function TextBox({
  label = 'Text Box',
  value,
  defaultValue = '',
  onChange,
  inputRef,
  ...props
}: TextBoxProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const text = value ?? internalValue;

  return (
    <div
      role="group"
      aria-label="Text box"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 88,
        border: '1px solid rgba(180, 212, 228, 0.26)',
        borderRadius: 2,
        background: 'linear-gradient(180deg, rgba(24, 37, 51, 0.98) 0%, rgba(11, 18, 28, 1) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 20px rgba(194,232,247,0.04)',
        overflow: 'hidden',
        padding: '10px 16px 14px',
        display: 'grid',
        gap: 8,
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 1, background: 'linear-gradient(90deg, rgba(235,248,255,0.08), rgba(245,251,255,0.92) 20%, rgba(212,231,242,0.18) 56%, rgba(235,248,255,0.08))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 0, width: 1, height: 18, background: 'linear-gradient(180deg, rgba(214,237,248,0.18), rgba(247,252,255,1) 58%, rgba(214,237,248,0.1))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 8, right: 0, height: 1, background: 'linear-gradient(90deg, rgba(235,248,255,0.2), rgba(248,252,255,0.98) 20%, rgba(224,239,246,0.24) 58%, rgba(235,248,255,0.16))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 8, width: 1, height: 14, background: 'linear-gradient(180deg, rgba(214,237,248,0.18), rgba(247,252,255,1) 58%, rgba(214,237,248,0.1))', transform: 'translateY(1px)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 0, bottom: 8, width: 1, height: 14, background: 'linear-gradient(180deg, rgba(214,237,248,0.18), rgba(247,252,255,1) 58%, rgba(214,237,248,0.1))', transform: 'translateY(1px)' }} />
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, color: '#eef7fd' }}>{label}</div>
      <div style={{ position: 'relative', minHeight: 40, width: '100%', maxWidth: '100%', border: '1px solid rgba(186, 220, 238, 0.42)', background: 'linear-gradient(180deg, rgba(18, 28, 39, 0.6) 0%, rgba(10, 16, 24, 0.38) 100%)', boxShadow: 'inset 0 0 0 1px rgba(240,248,252,0.06), inset 0 0 16px rgba(194,232,247,0.03)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 22% 28%, rgba(255,255,255,0.03), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.012), transparent 34%, rgba(255,255,255,0.01) 58%, transparent 78%)', opacity: 0.9, pointerEvents: 'none' }} />
        <input
          {...props}
          ref={inputRef}
          value={text}
          onChange={(event) => {
            if (value === undefined) {
              setInternalValue(event.target.value);
            }
            onChange?.(event.target.value);
          }}
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minHeight: 40,
            height: 40,
            border: 0,
            outline: 'none',
            background: 'transparent',
            color: '#eef7fd',
            padding: '0 16px',
            font: 'inherit',
            lineHeight: '48px',
          }}
        />
      </div>
    </div>
  );
}
