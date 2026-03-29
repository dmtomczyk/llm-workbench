import type { SVGProps } from 'react';

export function TargetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2.5V5" />
      <path d="M12 19V21.5" />
      <path d="M2.5 12H5" />
      <path d="M19 12H21.5" />
    </svg>
  );
}
