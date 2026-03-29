import type { SVGProps } from 'react';

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19C6.8 15.9 9 14.5 12 14.5C15 14.5 17.2 15.9 18.5 19" />
    </svg>
  );
}
