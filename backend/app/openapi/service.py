from __future__ import annotations

import json
from uuid import uuid4

import httpx
import yaml
from fastapi import HTTPException


class _NoDatesSafeLoader(yaml.SafeLoader):
    """YAML loader that keeps timestamp-like scalars as strings.

    PyYAML's default implicit resolvers coerce unquoted timestamps into
    datetime/date objects, which then break JSON serialization.

    For OpenAPI documents, treating these values as plain strings is the
    least-surprising behavior.
    """


# Remove the timestamp resolver so scalars like 2024-01-01 stay as strings.
for ch, resolvers in list(_NoDatesSafeLoader.yaml_implicit_resolvers.items()):
    _NoDatesSafeLoader.yaml_implicit_resolvers[ch] = [
        (tag, regexp) for (tag, regexp) in resolvers if tag != 'tag:yaml.org,2002:timestamp'
    ]
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.db.models import OpenAPISpec
from app.openapi.schemas import OpenAPISpecImportRequest, OpenAPISpecRead


class OpenAPIService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)

    async def import_spec(self, payload: OpenAPISpecImportRequest) -> OpenAPISpecRead:
        raw_text = await self._load_source(payload.source_type, payload.source)
        parsed = yaml.load(raw_text, Loader=_NoDatesSafeLoader)
        if not isinstance(parsed, dict):
            raise HTTPException(status_code=400, detail='OpenAPI source did not parse into an object')
        operations = self._extract_operations(parsed)
        security_schemes = parsed.get('components', {}).get('securitySchemes', {})
        row = OpenAPISpec(
            id=f'spec_{uuid4().hex}',
            name=payload.name,
            source_type=payload.source_type,
            source_ref=payload.source,
            raw_text=raw_text,
            parsed_json=json.dumps(parsed),
            operations_json=json.dumps(operations),
            security_schemes_json=json.dumps(security_schemes),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.audit.record(AuditEventCreate(action='openapi.spec_imported', entity_type='openapi_spec', entity_id=row.id, after={'name': row.name, 'operation_count': len(operations)}))
        return self._to_read(row)

    def list_specs(self) -> list[OpenAPISpecRead]:
        rows = self.db.scalars(select(OpenAPISpec).order_by(OpenAPISpec.created_at.desc())).all()
        return [self._to_read(row) for row in rows]

    def get_spec(self, spec_id: str) -> OpenAPISpecRead:
        row = self.db.get(OpenAPISpec, spec_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Spec not found')
        return self._to_read(row)

    def get_operations(self, spec_id: str) -> list[dict]:
        row = self.db.get(OpenAPISpec, spec_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Spec not found')
        return json.loads(row.operations_json or '[]')

    async def _load_source(self, source_type: str, source: str) -> str:
        if source_type == 'url':
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(source)
            response.raise_for_status()
            return response.text
        if source_type == 'raw_text':
            return source
        if source_type == 'file_path':
            from pathlib import Path
            path = Path(source).expanduser()
            return path.read_text(encoding='utf-8')
        raise HTTPException(status_code=400, detail=f'Unsupported source_type: {source_type}')

    def _extract_operations(self, parsed: dict) -> list[dict]:
        operations: list[dict] = []
        for path, methods in (parsed.get('paths') or {}).items():
            if not isinstance(methods, dict):
                continue
            for method, operation in methods.items():
                if method.lower() not in {'get', 'post', 'put', 'patch', 'delete', 'options', 'head'}:
                    continue
                operation = operation or {}
                operations.append({
                    'path': path,
                    'method': method.upper(),
                    'operation_id': operation.get('operationId') or f'{method}_{path}',
                    'summary': operation.get('summary'),
                    'description': operation.get('description'),
                    'tags': operation.get('tags', []),
                    'parameter_count': len(operation.get('parameters', [])),
                    'has_request_body': 'requestBody' in operation,
                    'security': operation.get('security'),
                })
        return operations

    @staticmethod
    def _to_read(row: OpenAPISpec) -> OpenAPISpecRead:
        return OpenAPISpecRead(
            id=row.id,
            name=row.name,
            source_type=row.source_type,
            source_ref=row.source_ref,
            operations=json.loads(row.operations_json or '[]'),
            security_schemes=json.loads(row.security_schemes_json or '{}'),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
