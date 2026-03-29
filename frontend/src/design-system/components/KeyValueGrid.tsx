import type { ReactNode } from 'react';

type KeyValueItem = {
  label: ReactNode;
  value: ReactNode;
};

type KeyValueGridProps = {
  items: KeyValueItem[];
  columns?: 2 | 3;
};

export function KeyValueGrid({ items, columns = 2 }: KeyValueGridProps) {
  return (
    <div className={`ds-keyvalue-grid ds-keyvalue-grid-${columns}`}>
      {items.map((item, index) => (
        <div key={index} className="ds-keyvalue-item">
          <div className="ds-keyvalue-label">{item.label}</div>
          <div className="ds-keyvalue-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
