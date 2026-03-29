import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

type CommandPaletteResult = {
  id?: string;
  title: ReactNode;
  meta?: ReactNode;
  onSelect?: () => void;
};

type Hotkey = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

type CommandPaletteTileProps = {
  title?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  leadingIcon?: ReactNode;
  submitIcon?: ReactNode;
  size?: 'sm' | 'md';
  emphasis?: 'default' | 'strong';
  hotkey?: Hotkey;
  showResults?: boolean;
  defaultOpen?: boolean;
  results?: CommandPaletteResult[];
};

const sizeMap = {
  sm: {
    shellMinHeight: 118,
    shellPadding: '16px 16px 14px',
    gap: 12,
    titleSize: 15,
    fieldMinHeight: 40,
    fieldGap: 10,
    iconSize: 24,
    iconWidth: 22,
    inputSize: 15,
    submitSize: 17,
  },
  md: {
    shellMinHeight: 130,
    shellPadding: '18px 18px 16px',
    gap: 14,
    titleSize: 16,
    fieldMinHeight: 42,
    fieldGap: 12,
    iconSize: 32,
    iconWidth: 28,
    inputSize: 16,
    submitSize: 18,
  },
} as const;

function hotkeyToLabel(hotkey?: Hotkey) {
  if (!hotkey) return null;
  const parts = [] as string[];
  if (hotkey.ctrlKey) parts.push('Ctrl');
  if (hotkey.metaKey) parts.push('⌘');
  if (hotkey.altKey) parts.push('Alt');
  if (hotkey.shiftKey) parts.push('Shift');
  parts.push(hotkey.key.toUpperCase());
  return parts.join('+');
}

function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey) {
  return (
    event.key.toLowerCase() === hotkey.key.toLowerCase() &&
    !!event.ctrlKey === !!hotkey.ctrlKey &&
    !!event.metaKey === !!hotkey.metaKey &&
    !!event.altKey === !!hotkey.altKey &&
    !!event.shiftKey === !!hotkey.shiftKey
  );
}

export function CommandPaletteTile({
  title = 'Command Palette',
  value,
  onChange,
  onSubmit,
  placeholder = 'Search ...',
  leadingIcon = '⌕',
  submitIcon = '▸',
  size = 'md',
  emphasis = 'strong',
  hotkey,
  showResults = false,
  defaultOpen = false,
  results = [],
}: CommandPaletteTileProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const s = sizeMap[size];
  const titleWeight = emphasis === 'strong' ? 700 : 600;
  const hotkeyLabel = hotkeyToLabel(hotkey);

  useEffect(() => {
    if (!hotkey) return;
    const handler = (event: KeyboardEvent) => {
      if (!matchesHotkey(event, hotkey)) return;
      event.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hotkey]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const shellStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: s.shellMinHeight,
    borderRadius: 2,
    border: '2px solid rgba(208, 234, 246, 0.34)',
    background: 'linear-gradient(180deg, rgba(23, 34, 48, 0.98) 0%, rgba(11, 18, 28, 1) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 20px rgba(180, 223, 243, 0.035), 0 0 0 1px rgba(248,252,255,0.04)',
    overflow: 'hidden',
    padding: s.shellPadding,
    display: 'grid',
    alignContent: 'start',
    gap: s.gap,
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSubmit?.();
  };

  const shouldShowResults = showResults && open && results.length > 0;

  return (
    <div ref={rootRef} role="group" aria-label={`${title} command palette tile`} style={shellStyle}>
      <span aria-hidden="true" style={{ position: 'absolute', top: 10, left: 12, right: 12, height: 1, background: 'linear-gradient(90deg, rgba(233,247,255,0.08), rgba(248,252,255,0.88) 22%, rgba(224,239,246,0.16) 55%, rgba(233,247,255,0.08))' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 10, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.82), rgba(224,239,246,0.12))' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: s.titleSize, fontWeight: titleWeight, lineHeight: 1, letterSpacing: '-0.01em', color: '#eef7fd' }}>{title}</div>
          <span aria-hidden="true" style={{ height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.82), rgba(224,239,246,0.12) 48%, transparent)' }} />
          {hotkeyLabel ? <span style={{ color: '#cddbe4', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{hotkeyLabel}</span> : null}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          minHeight: s.fieldMinHeight,
          borderRadius: 2,
          border: '2px solid rgba(208, 234, 246, 0.38)',
          background: 'linear-gradient(180deg, rgba(33, 52, 70, 0.96) 0%, rgba(18, 30, 41, 0.98) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 18px rgba(180, 223, 243, 0.04)',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0,1fr) auto',
          alignItems: 'center',
          gap: s.fieldGap,
          padding: '0 12px 0 14px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0,1fr)',
            alignItems: 'center',
            gap: s.fieldGap,
            minWidth: 0,
            gridColumn: '1 / 3',
            background: 'transparent',
            border: 0,
            padding: 0,
            margin: 0,
            color: 'inherit',
            textAlign: 'left',
            cursor: 'text',
          }}
        >
          <span style={{ color: '#eef7fd', fontSize: s.iconSize, lineHeight: 1, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: s.iconWidth }}>{leadingIcon}</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              if (showResults) setOpen(true);
            }}
            placeholder={placeholder}
            onClick={(event) => event.stopPropagation()}
            onFocus={() => {
              if (showResults) setOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#eef7fd', fontSize: s.inputSize, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.01em', padding: '0 0 0 6px' }}
          />
        </button>
        <button
          type="button"
          onClick={() => onSubmit?.()}
          aria-label="Submit search"
          style={{ background: 'transparent', border: 0, padding: 0, margin: 0, color: '#d7e6ef', fontSize: s.submitSize, lineHeight: 1, cursor: 'pointer' }}
        >
          {submitIcon}
        </button>
      </div>
      {shouldShowResults ? (
        <div style={{ border: '1px solid rgba(170, 211, 231, 0.18)', borderRadius: 4, padding: 0, background: 'linear-gradient(180deg, rgba(19,30,43,0.74) 0%, rgba(10,16,24,0.82) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', display: 'grid', overflow: 'hidden' }}>
          {results.map((result, index) => (
            <button
              key={result.id ?? `${index}-${String(result.title)}`}
              type="button"
              onClick={() => {
                result.onSelect?.();
                setOpen(false);
              }}
              style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 10, padding: '11px 12px', border: 0, borderTop: index === 0 ? '0' : '1px solid rgba(196, 226, 241, 0.12)', background: 'transparent', color: '#dbe9f1', textAlign: 'left', cursor: 'pointer' }}
            >
              <span style={{ minWidth: 0 }}>{result.title}</span>
              {result.meta ? <span>{result.meta}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
