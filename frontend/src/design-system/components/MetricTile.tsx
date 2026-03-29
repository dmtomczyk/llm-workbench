import type { CSSProperties, ReactNode } from 'react';

type MetricTileProps = {
  value: ReactNode;
  label: ReactNode;
  emphasis?: 'default' | 'strong';
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
};

const toneMap: Record<NonNullable<MetricTileProps['tone']>, { border: string; frame: string; bright: string; mid: string; bg: string; text: string }> = {
  neutral: {
    border: 'rgba(186, 220, 238, 0.24)',
    frame: 'rgba(202, 232, 246, 0.15)',
    bright: 'rgba(248,252,255,1)',
    mid: 'rgba(224,239,246,0.2)',
    bg: 'linear-gradient(180deg, rgba(28, 40, 56, 0.99) 0%, rgba(11, 18, 28, 1) 100%)',
    text: '#f4faff',
  },
  info: {
    border: 'rgba(174, 227, 244, 0.26)',
    frame: 'rgba(206, 239, 249, 0.16)',
    bright: 'rgba(246,252,255,1)',
    mid: 'rgba(171,228,244,0.24)',
    bg: 'linear-gradient(180deg, rgba(25, 43, 58, 0.99) 0%, rgba(10, 18, 28, 1) 100%)',
    text: '#f4fbff',
  },
  success: {
    border: 'rgba(129, 227, 193, 0.28)',
    frame: 'rgba(170, 238, 213, 0.16)',
    bright: 'rgba(235,255,247,1)',
    mid: 'rgba(117,224,184,0.24)',
    bg: 'linear-gradient(180deg, rgba(19, 53, 47, 0.99) 0%, rgba(9, 23, 21, 1) 100%)',
    text: '#f1fff8',
  },
  warning: {
    border: 'rgba(255, 207, 130, 0.28)',
    frame: 'rgba(255, 225, 172, 0.16)',
    bright: 'rgba(255,250,240,1)',
    mid: 'rgba(255, 195, 107, 0.24)',
    bg: 'linear-gradient(180deg, rgba(67, 45, 18, 0.99) 0%, rgba(28, 18, 8, 1) 100%)',
    text: '#fff8eb',
  },
  danger: {
    border: 'rgba(255, 151, 151, 0.28)',
    frame: 'rgba(255, 198, 198, 0.16)',
    bright: 'rgba(255,246,246,1)',
    mid: 'rgba(255, 125, 125, 0.24)',
    bg: 'linear-gradient(180deg, rgba(67, 25, 33, 0.99) 0%, rgba(26, 12, 16, 1) 100%)',
    text: '#fff3f3',
  },
};

const sizeMap: Record<NonNullable<MetricTileProps['size']>, { minHeight: number; valueSize: number; labelSize: number; top: string; split: string; labelTop: string }> = {
  sm: {
    minHeight: 104,
    valueSize: 31,
    labelSize: 14,
    top: '19%',
    split: '58%',
    labelTop: '67%',
  },
  md: {
    minHeight: 118,
    valueSize: 35,
    labelSize: 15,
    top: '18%',
    split: '58%',
    labelTop: '67%',
  },
};

export function MetricTile({ value, label, emphasis = 'default', tone = 'neutral', size = 'md' }: MetricTileProps) {
  const t = toneMap[tone];
  const s = sizeMap[size];
  const valueWeight = emphasis === 'strong' ? 650 : 600;
  const labelWeight = emphasis === 'strong' ? 650 : 600;

  const shell: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: s.minHeight,
    borderRadius: 2,
    border: `1px solid ${t.border}`,
    background: t.bg,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 28px rgba(196, 234, 250, 0.06)',
    overflow: 'hidden',
  };

  return (
    <div role="group" aria-label={`${label} metric tile`} style={shell}>
      <span aria-hidden="true" style={{ position: 'absolute', inset: 6, border: `1px solid ${t.frame}` }} />
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 19%, transparent 77%, rgba(198,229,243,0.03))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 8, left: 10, right: 10, height: 1, background: `linear-gradient(90deg, rgba(233,247,255,0.12), ${t.bright} 18%, ${t.mid} 55%, rgba(233,247,255,0.1))` }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, right: 10, top: s.split, height: 1, background: `linear-gradient(90deg, rgba(233,247,255,0.08), ${t.bright.replace('1)', '0.74)')} 22%, ${t.mid.replace('0.24)', '0.18)')} 55%, rgba(233,247,255,0.08))` }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, top: s.split, width: 17, height: 1, background: `linear-gradient(90deg, ${t.bright}, ${t.mid.replace('0.24)', '0.14)')})` }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, top: `calc(${s.split} - 13px)`, width: 1, height: 26, background: `linear-gradient(180deg, ${t.mid.replace('0.24)', '0.08)')}, ${t.bright} 50%, ${t.mid.replace('0.24)', '0.08)')})` }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, bottom: 8, width: 12, height: 1, background: `linear-gradient(90deg, ${t.bright.replace('1)', '0.94)')}, ${t.mid.replace('0.24)', '0.18)')})` }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 10, bottom: 8, width: 1, height: 12, background: `linear-gradient(180deg, ${t.bright.replace('1)', '0.94)')}, ${t.mid.replace('0.24)', '0.18)')})`, transform: 'translateY(-11px)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, bottom: 8, width: 12, height: 1, background: `linear-gradient(270deg, ${t.bright.replace('1)', '0.94)')}, ${t.mid.replace('0.24)', '0.18)')})` }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, bottom: 8, width: 1, height: 12, background: `linear-gradient(180deg, ${t.bright.replace('1)', '0.94)')}, ${t.mid.replace('0.24)', '0.18)')})`, transform: 'translateY(-11px)' }} />
      <div style={{ position: 'absolute', top: s.top, left: 0, right: 0, textAlign: 'center', fontSize: s.valueSize, lineHeight: 1, fontWeight: valueWeight, letterSpacing: '-0.045em', color: t.text }}>{value}</div>
      <div style={{ position: 'absolute', top: s.labelTop, left: 0, right: 0, textAlign: 'center', fontSize: s.labelSize, lineHeight: 1, fontWeight: labelWeight, color: '#e2edf3' }}>{label}</div>
    </div>
  );
}
