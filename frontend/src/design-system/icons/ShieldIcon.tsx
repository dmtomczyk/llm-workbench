import type { SVGProps } from 'react';

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3L18.5 5.7V11.4C18.5 15.5 15.9 19 12 21C8.1 19 5.5 15.5 5.5 11.4V5.7L12 3Z" />
      <path d="M9.4 12.2L11.2 14L14.8 10.4" />
    </svg>
  );
}
