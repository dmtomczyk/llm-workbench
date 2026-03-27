import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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

type ImportRun = {
  id: string;
  dataset_id?: string | null;
  status: string;
  original_filename?: string | null;
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

function formatDatasetTimestamp(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const SUPPORTED_UPLOAD_LABEL = 'Supported now: .csv, .json, .txt, .md, .eml. Allowed but optional-parser-dependent: .xlsx, .docx, .pdf, .msg.';

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDatasetName, setUploadDatasetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function onUploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      if (uploadDatasetName.trim()) formData.set('dataset_name', uploadDatasetName.trim());
      formData.set('file', file);
      const response = await fetch('/api/imports/files', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text() || 'Upload failed');
      }
      const result = await response.json() as ImportRun;
      await loadDatasets();
      if (result.dataset_id) {
        setSelectedDatasetId(result.dataset_id);
        await loadPreview(result.dataset_id);
      }
      setUploadDatasetName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    void loadDatasets();
  }, []);

  useEffect(() => {
    void loadPreview(selectedDatasetId);
  }, [selectedDatasetId]);

  const sampleItems = preview?.preview?.sample_items;

  return (
    <div className="stack">
      {showUploadModal ? (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="modal-card modal-card-sm" onClick={(event) => event.stopPropagation()}>
            <div className="row between wrap">
              <h2>Upload file</h2>
              <button type="button" onClick={() => setShowUploadModal(false)}>Close</button>
            </div>
            <form className="stack" onSubmit={onUploadFile}>
              <input value={uploadDatasetName} onChange={(event) => setUploadDatasetName(event.target.value)} placeholder="Optional dataset name" />
              <input ref={fileInputRef} name="file" type="file" accept=".csv,.json,.txt,.md,.eml,.xlsx,.docx,.pdf,.msg" required />
              <div className="muted">This creates or imports a dataset directly from the uploaded file without requiring a saved recipe.</div>
              <div className="notice">{SUPPORTED_UPLOAD_LABEL}</div>
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload file'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="card stack">
        <div className="row between wrap">
          <div>
            <h2>Datasets</h2>
            <p className="muted">Datasets are the core handoff object in BRIDGE: inspect the data here, then launch into chat, workbench, workflows, imports, or automations.</p>
          </div>
          <div className="stack compact-stack" style={{ alignItems: 'flex-end' }}>
            <div className="row wrap">
              <button type="button" onClick={() => setShowUploadModal(true)}>Upload file</button>
              <a className="button-link" href="/recipes">Open imports</a>
            </div>
            <div className="muted" style={{ maxWidth: '28rem', textAlign: 'right' }}>{SUPPORTED_UPLOAD_LABEL}</div>
          </div>
        </div>
      </div>
      <div className="grid two-col">
        <div className="stack">
          <div className="card">
            <div className="row between wrap">
              <h2>Available datasets</h2>
              {selectedDataset ? <a className="button-link" href={`/recipes?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Open imports</a> : null}
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
                  <a className="button-link" href={`/recipes?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Update via Imports</a>
                </div>

                <div className="dataset-hero-grid">
                  <div className="card dataset-launch-card stack">
                    <div>
                      <h3>Start from this dataset</h3>
                      <p className="muted">Use the same dataset context across the rest of BRIDGE.</p>
                    </div>
                    <div className="row wrap">
                      <a className="button-link" href={`/chat?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Chat with dataset</a>
                      <a className="button-link" href={`/workbench?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Test in Workbench</a>
                      <a className="button-link" href={`/workflows?dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Run Workflow</a>
                      <a className="button-link" href={`/automations?target_type=template_prompt&dataset_id=${encodeURIComponent(selectedDataset.id)}`}>Automate</a>
                    </div>
                  </div>

                  <div className="card dataset-summary-card stack">
                    <h3>Dataset summary</h3>
                    <div className="pill-row">
                      <span className="pill">Source: {selectedDataset.source_type ?? 'unknown'}</span>
                      <span className="pill">Latest version: {selectedDataset.latest_version_no ?? 0}</span>
                      <span className="pill">Rows: {selectedDataset.latest_version?.row_count ?? 'unknown'}</span>
                    </div>
                    <div className="grid dataset-meta-grid">
                      <div><strong>Updated</strong><div className="muted">{formatDatasetTimestamp(selectedDataset.updated_at ?? selectedDataset.created_at)}</div></div>
                      <div><strong>Media type</strong><div className="muted">{selectedDataset.media_type ?? '—'}</div></div>
                      <div><strong>Version created</strong><div className="muted">{formatDatasetTimestamp(selectedDataset.latest_version?.created_at)}</div></div>
                      <div><strong>Source ref</strong><div className="muted">{selectedDataset.source_ref ?? '—'}</div></div>
                    </div>
                  </div>
                </div>

                <details open>
                  <summary>Source / provenance</summary>
                  <pre>{prettyJson({ source_type: selectedDataset.source_type, source_ref: selectedDataset.source_ref, media_type: selectedDataset.media_type, metadata: selectedDataset.metadata, latest_version: selectedDataset.latest_version })}</pre>
                </details>
              </div>
            )}
          </div>

          <div className="card stack">
            <div>
              <h2>Latest preview</h2>
              <div className="muted">Inspect the current version here before branching into chat, workbench, or workflows.</div>
            </div>
            {!preview ? <p className="muted">No preview available.</p> : isRecordArray(sampleItems) ? renderRecordTable(sampleItems) : <pre>{prettyJson(preview.preview ?? preview.normalized_payload ?? {})}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}
