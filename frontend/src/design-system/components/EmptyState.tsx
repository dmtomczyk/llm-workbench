import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ds-empty-state">
      <div className="ds-empty-glyph" aria-hidden="true">◌</div>
      <div className="ds-empty-title">{title}</div>
      {description ? <div className="ds-empty-description">{description}</div> : null}
      {action ? <div className="ds-empty-action">{action}</div> : null}
    </div>
  );
}
