import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Audit = { id: string; action: string; status: string; entity_type: string; occurred_at: string; correlation_id?: string };

export function AuditPage() {
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    api<Audit[]>('/api/audit').then(setAudits).catch(() => setAudits([]));
  }, []);

  return (
    <div className="card">
      <h2>Audit trail</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Status</th>
            <th>Correlation</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => (
            <tr key={audit.id}>
              <td>{audit.occurred_at}</td>
              <td>{audit.action}</td>
              <td>{audit.entity_type}</td>
              <td>{audit.status}</td>
              <td>{audit.correlation_id ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
