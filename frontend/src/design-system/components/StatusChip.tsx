import { useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type StatusChipTone = 'default' | 'hover' | 'selected' | 'disabled' | 'success' | 'warning' | 'error';
export type StatusChipStyle = 'rounded' | 'box';
export type StatusChipBackgroundEffect = 'flat' | 'matte' | 'gradient' | 'glow' | 'neon';

type StatusChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  text: ReactNode;
  tone?: StatusChipTone;
  chipStyle?: StatusChipStyle;
  clickable?: boolean;
  trailing?: ReactNode;
  chipBackgroundColor?: string;
  backgroundEffect?: StatusChipBackgroundEffect;
  fontColor?: string;
  haloBoost?: number;
  active?: boolean;
  defaultActive?: boolean;
  onActiveChange?: (active: boolean) => void;
};

const toneStyles = {
  default: { border: 'rgba(160, 200, 220, 0.28)', glow: 'rgba(150, 214, 244, 0.08)', text: '#dce9f1', fillA: 'rgba(48, 68, 84, 0.92)', fillB: 'rgba(20, 29, 39, 0.96)' },
  hover: { border: 'rgba(136, 220, 255, 0.5)', glow: 'rgba(126, 217, 255, 0.14)', text: '#eaf7ff', fillA: 'rgba(59, 87, 107, 0.94)', fillB: 'rgba(22, 34, 46, 0.96)' },
  selected: { border: 'rgba(113, 218, 255, 0.82)', glow: 'rgba(72, 199, 255, 0.22)', text: '#eefbff', fillA: 'rgba(74, 120, 150, 0.96)', fillB: 'rgba(28, 52, 72, 0.98)' },
  disabled: { border: 'rgba(154, 180, 198, 0.22)', glow: 'rgba(120, 142, 156, 0.05)', text: '#9caebb', fillA: 'rgba(41, 53, 63, 0.84)', fillB: 'rgba(20, 25, 31, 0.9)' },
  success: { border: 'rgba(140, 255, 183, 0.58)', glow: 'rgba(103, 247, 158, 0.18)', text: '#effff5', fillA: 'rgba(54, 118, 84, 0.96)', fillB: 'rgba(22, 63, 43, 0.98)' },
  warning: { border: 'rgba(255, 202, 102, 0.6)', glow: 'rgba(255, 194, 84, 0.18)', text: '#fff2cc', fillA: 'rgba(138, 96, 38, 0.96)', fillB: 'rgba(82, 53, 22, 0.98)' },
  error: { border: 'rgba(255, 122, 104, 0.66)', glow: 'rgba(255, 107, 87, 0.2)', text: '#ffe2dc', fillA: 'rgba(136, 58, 56, 0.97)', fillB: 'rgba(84, 28, 28, 0.99)' },
} as const;

function effectBackground(tone: StatusChipTone, backgroundEffect: StatusChipBackgroundEffect, chipBackgroundColor: string, rectangular: boolean, emphatic: boolean) {
  const toneGlow = toneStyles[tone].glow;
  const filledTone = tone === 'selected' || tone === 'success' || tone === 'warning' || tone === 'error';
  const fillA = toneStyles[tone].fillA;
  const fillB = toneStyles[tone].fillB;
  const neutralA = rectangular ? 'rgba(35, 52, 68, 0.94)' : chipBackgroundColor;
  const neutralB = rectangular ? 'rgba(18, 28, 39, 0.96)' : 'rgba(17, 26, 37, 0.94)';

  if (backgroundEffect === 'flat') return filledTone ? fillA : chipBackgroundColor;
  if (backgroundEffect === 'matte') return `linear-gradient(180deg, ${filledTone ? fillA : chipBackgroundColor} 0%, ${filledTone ? fillB : 'rgba(18, 26, 36, 0.94)'} 100%)`;
  if (backgroundEffect === 'glow') {
    return `radial-gradient(circle at 50% 48%, ${toneGlow.replace(/0\.[0-9]+\)/, `${emphatic || filledTone ? (rectangular ? 0.32 : 0.38) : (rectangular ? 0.18 : 0.22)})`)}, transparent 70%), linear-gradient(180deg, ${filledTone ? fillA : neutralA} 0%, ${filledTone ? fillB : neutralB} 100%)`;
  }
  if (backgroundEffect === 'neon') {
    return `radial-gradient(circle at 50% 48%, ${toneGlow.replace(/0\.[0-9]+\)/, `${emphatic || filledTone ? (rectangular ? 0.46 : 0.54) : (rectangular ? 0.28 : 0.34)})`)}, transparent 74%), linear-gradient(180deg, ${filledTone ? fillA : 'rgba(70, 101, 126, 0.9)'} 0%, ${filledTone ? fillB : 'rgba(24, 36, 48, 0.98)'} 100%)`;
  }
  return `linear-gradient(180deg, ${filledTone ? fillA : neutralA} 0%, ${filledTone ? fillB : neutralB} 100%)`;
}

function haloShadow(tone: StatusChipTone, rectangular: boolean, haloBoost: number) {
  const outerA = rectangular ? 20 : 18;
  const outerB = rectangular ? 34 : 28;
  return `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 ${outerA}px ${toneStyles[tone].glow}, 0 0 ${outerB}px ${toneStyles[tone].glow.replace(/0\.[0-9]+\)/, `${Math.min(0.34, 0.08 * haloBoost)})`)}`;
}

export function StatusChip({
  text,
  tone = 'default',
  chipStyle = 'rounded',
  clickable = false,
  trailing,
  chipBackgroundColor = 'rgba(28, 43, 57, 0.92)',
  backgroundEffect = 'gradient',
  fontColor,
  haloBoost = 1.45,
  active,
  defaultActive = false,
  onActiveChange,
  onClick,
  disabled,
  ...props
}: StatusChipProps) {
  const [internalActive, setInternalActive] = useState(defaultActive);
  const isActive = active ?? internalActive;
  const rectangular = chipStyle === 'box';
  const resolvedDisabled = disabled || tone === 'disabled';
  const emphatic = isActive || tone === 'selected' || tone === 'error';

  return (
    <button
      {...props}
      type="button"
      disabled={resolvedDisabled}
      onClick={(event) => {
        if (clickable && active === undefined) {
          const next = !internalActive;
          setInternalActive(next);
          onActiveChange?.(next);
        }
        onClick?.(event);
      }}
      style={{
        minWidth: rectangular ? 120 : 94,
        minHeight: rectangular ? 40 : 32,
        padding: rectangular ? '0 14px' : '0 16px',
        borderRadius: rectangular ? 2 : 12,
        border: `1px solid ${toneStyles[tone].border}`,
        background: effectBackground(tone, backgroundEffect, chipBackgroundColor, rectangular, emphatic),
        boxShadow: haloShadow(tone, rectangular, haloBoost),
        color: fontColor ?? toneStyles[tone].text,
        fontSize: 15,
        fontWeight: emphatic ? 600 : 500,
        letterSpacing: '-0.01em',
        display: 'grid',
        gridTemplateColumns: rectangular ? '1fr auto' : undefined,
        alignItems: 'center',
        gap: rectangular ? 10 : undefined,
        textAlign: rectangular ? 'left' : 'center',
        position: 'relative',
        cursor: clickable && !resolvedDisabled ? 'pointer' : 'default',
        opacity: resolvedDisabled ? 0.82 : 1,
      }}
    >
      {rectangular ? <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.74), rgba(224,239,246,0.12) 50%, transparent)' }} /> : null}
      <span>{text}</span>
      {rectangular ? <span style={{ color: fontColor ?? toneStyles[tone].text, opacity: tone === 'disabled' ? 0.7 : 0.95 }}>{trailing ?? ''}</span> : null}
    </button>
  );
}
