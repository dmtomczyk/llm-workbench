import { useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type Dataset = {
  id: string;
  name: string;
  source_type?: string;
  source_ref?: string | null;
  media_type?: string | null;
  latest_version_no?: number;
  metadata?: Record<string, unknown>;
  latest_version?: {
    id: string;
    row_count?: number | null;
    storage_path?: string | null;
    normalized_payload_path?: string | null;
    metadata?: Record<string, unknown>;
    created_at?: string;
  };
  created_at?: string;
  updated_at?: string;
};

type DatasetPreview = {
  dataset_id: string;
  version_id: string;
  preview?: Record<string, unknown>;
  normalized_payload?: { type?: string; items?: unknown[]; metadata?: Record<string, unknown> };
};

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function renderRecordTable(items: Record<string, unknown>[]) {
  const columns = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  return (
    <div className="table-wrap">
      <table className="table compact-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>{columns.map((column) => <td key={column}>{String(item[column] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [error, setError] = useState('');

  const selectedDataset = useMemo(() => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null, [datasets, selectedDatasetId]);

  async function loadDatasets() {
    const data = await api<Dataset[]>('/api/datasets').catch(() => []);
    setDatasets(data);
    setSelectedDatasetId((current) => current || data[0]?.id || '');
  }

  async function loadPreview(datasetId: string) {
    if (!datasetId) {
      setPreview(null);
      return;
    }
    const data = await api<DatasetPreview>(`/api/datasets/${datasetId}/preview`).catch(() => null);
    setPreview(data);
  }

  useEffect(() => {
    void loadDatasets();
  }, []);

  useEffect(() => {
    void loadPreview(selectedDatasetId);
  }, [selectedDatasetId]);

  const sampleItems = preview?.preview?.sample_items;

  return (
    <div className="grid two-col">
      <div className="stack">
        <div className="card">
          <div className="row between wrap">
            <h2>Datasets</h2>
            {selectedDataset ? <a className="button-link" href={`/recipes?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Find recipes</a> : null}
          </div>
          {error ? <pre>{error}</pre> : null}
          <ul className="list">
            {datasets.length === 0 ? <li>No datasets yet.</li> : datasets.map((dataset) => (
              <li key={dataset.id}>
                <button type="button" className={selectedDatasetId === dataset.id ? 'session-button active' : 'session-button'} onClick={() => setSelectedDatasetId(dataset.id)}>
                  <strong>{dataset.name}</strong>
                  <div className="muted">{dataset.source_type ?? 'unknown source'} · v{dataset.latest_version_no ?? 0}</div>
                  <div className="muted">rows: {dataset.latest_version?.row_count ?? 'unknown'} · {dataset.updated_at ?? dataset.created_at ?? '—'}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          {!selectedDataset ? <p className="muted">Select a dataset to inspect it.</p> : (
            <div className="stack">
              <div className="row between wrap">
                <div>
                  <h2>{selectedDataset.name}</h2>
                  <div className="muted">{selectedDataset.id}</div>
                </div>
                <div className="row wrap">
                  <a className="button-link" href={`/chat?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Open in Chat</a>
                  <a className="button-link" href={`/workbench?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Open in Workbench</a>
                  <a className="button-link" href={`/workflows?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Use in Workflow</a>
                  <a className="button-link" href={`/automations?target_type=template_prompt&dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Seed Automation</a>
                </div>
              </div>
              <div className="pill-row">
                <span className="pill">Source: {selectedDataset.source_type ?? 'unknown'}</span>
                <span className="pill">Latest version: {selectedDataset.latest_version_no ?? 0}</span>
                <span className="pill">Rows: {selectedDataset.latest_version?.row_count ?? 'unknown'}</span>
              </div>
              <details open>
                <summary>Source / provenance</summary>
                <pre>{prettyJson({ source_type: selectedDataset.source_type, source_ref: selectedDataset.source_ref, media_type: selectedDataset.media_type, metadata: selectedDataset.metadata, latest_version: selectedDataset.latest_version })}</pre>
              </details>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Latest preview</h2>
          {!preview ? <p className="muted">No preview available.</p> : isRecordArray(sampleItems) ? renderRecordTable(sampleItems) : <pre>{prettyJson(preview.preview ?? preview.normalized_payload ?? {})}</pre>}
        </div>
      </div>
    </div>
  );
}
