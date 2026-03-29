import { useRef, useState } from 'react';
import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react';

type MultiLineTextFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange'> & {
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  lines?: number;
  scrollable?: boolean;
  resizable?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

export function MultiLineTextField({
  label = 'Multi-Line Text',
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Type Here...',
  lines = 4,
  scrollable = true,
  resizable = false,
  textareaRef,
  ...props
}: MultiLineTextFieldProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [fieldSize, setFieldSize] = useState<{ width?: number; height?: number }>({});
  const shellRef = useRef<HTMLDivElement | null>(null);
  const text = value ?? internalValue;
  const lineHeight = 22;
  const minFieldHeight = Math.max(82, lines * lineHeight + 28);
  const minFieldWidth = 220;

  const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!resizable || !shellRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const shellRect = shellRef.current.getBoundingClientRect();
    const startWidth = fieldSize.width ?? shellRect.width - 44;
    const startHeight = fieldSize.height ?? minFieldHeight;
    const maxWidth = Math.max(minFieldWidth, shellRect.width - 44);
    const maxHeight = Math.max(minFieldHeight, window.innerHeight - shellRect.top - 24);
    const originX = event.clientX;
    const originY = event.clientY;

    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(maxWidth, Math.max(minFieldWidth, startWidth + (moveEvent.clientX - originX)));
      const nextHeight = Math.min(maxHeight, Math.max(minFieldHeight, startHeight + (moveEvent.clientY - originY)));
      setFieldSize({ width: nextWidth, height: nextHeight });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={shellRef}
      role="group"
      aria-label="Multi-line text field"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: (fieldSize.height ?? minFieldHeight) + 58,
        border: '1px solid rgba(180, 212, 228, 0.26)',
        borderRadius: 2,
        background: 'linear-gradient(180deg, rgba(24, 37, 51, 0.98) 0%, rgba(11, 18, 28, 1) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 20px rgba(194,232,247,0.04)',
        overflow: 'hidden',
        padding: '14px 22px 20px',
        display: 'grid',
        gap: 12,
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 1, background: 'linear-gradient(90deg, rgba(235,248,255,0.08), rgba(245,251,255,0.92) 20%, rgba(212,231,242,0.18) 56%, rgba(235,248,255,0.08))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 0, width: 1, height: 18, background: 'linear-gradient(180deg, rgba(214,237,248,0.18), rgba(247,252,255,1) 58%, rgba(214,237,248,0.1))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 12, right: 0, height: 1, background: 'linear-gradient(90deg, rgba(235,248,255,0.2), rgba(248,252,255,0.98) 20%, rgba(224,239,246,0.24) 58%, rgba(235,248,255,0.16))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 12, width: 1, height: 18, background: 'linear-gradient(180deg, rgba(214,237,248,0.18), rgba(247,252,255,1) 58%, rgba(214,237,248,0.1))', transform: 'translateY(1px)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 0, bottom: 12, width: 1, height: 18, background: 'linear-gradient(180deg, rgba(214,237,248,0.18), rgba(247,252,255,1) 58%, rgba(214,237,248,0.1))', transform: 'translateY(1px)' }} />
      <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1, color: '#eef7fd' }}>{label}</div>
      <div style={{ position: 'relative', minHeight: minFieldHeight, width: fieldSize.width ? `${fieldSize.width}px` : '100%', maxWidth: '100%', border: '1px solid rgba(186, 220, 238, 0.42)', background: 'linear-gradient(180deg, rgba(18, 28, 39, 0.6) 0%, rgba(10, 16, 24, 0.38) 100%)', boxShadow: 'inset 0 0 0 1px rgba(240,248,252,0.06), inset 0 0 16px rgba(194,232,247,0.03)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 22% 28%, rgba(255,255,255,0.03), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.012), transparent 34%, rgba(255,255,255,0.01) 58%, transparent 78%)', opacity: 0.9, pointerEvents: 'none' }} />
        <textarea
          {...props}
          ref={textareaRef}
          value={text}
          onChange={(event) => {
            if (value === undefined) {
              setInternalValue(event.target.value);
            }
            onChange?.(event.target.value);
          }}
          placeholder={placeholder}
          rows={lines}
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minHeight: fieldSize.height ?? minFieldHeight,
            height: fieldSize.height ? `${fieldSize.height}px` : undefined,
            resize: 'none',
            overflowY: scrollable ? 'auto' : 'hidden',
            overflowX: 'hidden',
            border: 0,
            outline: 'none',
            background: 'transparent',
            color: '#eef7fd',
            padding: '14px 16px',
            font: 'inherit',
            lineHeight: `${lineHeight}px`,
          }}
        />
        {resizable ? (
          <div
            onMouseDown={startResize}
            role="presentation"
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 7,
              bottom: 7,
              width: 14,
              height: 14,
              cursor: 'nwse-resize',
              zIndex: 2,
              background: 'linear-gradient(135deg, transparent 0 42%, rgba(248,252,255,0.5) 42% 48%, transparent 48% 62%, rgba(248,252,255,0.38) 62% 68%, transparent 68% 100%)',
              opacity: 0.9,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
