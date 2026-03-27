function summarizeErrorBody(body: unknown): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const detail = record.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
      const detailRecord = detail as Record<string, unknown>;
      const parts: string[] = [];
      if (typeof detailRecord.message === 'string') parts.push(detailRecord.message);
      if (typeof detailRecord.type === 'string') parts.push(`type=${detailRecord.type}`);
      if (typeof detailRecord.run_id === 'string') parts.push(`run=${detailRecord.run_id}`);
      if (parts.length > 0) return parts.join(' · ');
      return 'Request failed';
    }
    if (typeof record.message === 'string') return record.message;
    return 'Request failed';
  }
  if (typeof body === 'string') return body;
  return 'Request failed';
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let maybeJson: unknown = null;
  if (contentType.includes('application/json') && rawText) {
    try {
      maybeJson = JSON.parse(rawText);
    } catch {
      maybeJson = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('bridge:unauthorized'));
    }
    const summary = summarizeErrorBody(maybeJson ?? rawText);
    throw new Error(`${response.status} ${response.statusText}: ${summary}`.trim());
  }

  if (!rawText) {
    return undefined as T;
  }

  return (maybeJson ?? JSON.parse(rawText)) as T;
}
