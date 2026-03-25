from __future__ import annotations

import hashlib
import json
import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.core.config import get_settings
from app.db.models import Dataset, DatasetVersion, ImportRecord
from app.imports.parsers import FileParser


class ImportService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.audit = AuditService(db)
        self.parser = FileParser()

    async def create_import(self, upload: UploadFile, dataset_name: str | None = None) -> dict:
        if not upload.filename:
            raise HTTPException(status_code=400, detail='filename is required')
        extension = Path(upload.filename).suffix.lower().lstrip('.')
        if extension not in self.settings.imports.allowed_extensions:
            raise HTTPException(status_code=400, detail=f'extension .{extension} is not allowed')

        import_id = f'imp_{uuid4().hex}'
        dataset_id = f'ds_{uuid4().hex}'
        version_id = f'dsv_{uuid4().hex}'
        safe_name = Path(upload.filename).name
        raw_bytes = await upload.read()
        checksum = hashlib.sha256(raw_bytes).hexdigest()
        storage_path = self.settings.resolve_path(self.settings.storage.imports_dir) / f'{import_id}_{safe_name}'
        storage_path.write_bytes(raw_bytes)
        media_type = upload.content_type or mimetypes.guess_type(safe_name)[0] or 'application/octet-stream'

        dataset = Dataset(
            id=dataset_id,
            name=dataset_name or Path(safe_name).stem,
            source_type='upload',
            source_ref=safe_name,
            media_type=media_type,
            latest_version_no=1,
            metadata_json=json.dumps({'original_filename': safe_name}),
        )
        parsed = self.parser.parse(storage_path, media_type=media_type)
        normalized_path = self.settings.resolve_path(self.settings.storage.artifacts_dir) / f'{version_id}_normalized.json'
        normalized_path.write_text(json.dumps(parsed.normalized_payload, indent=2, ensure_ascii=False), encoding='utf-8')
        version = DatasetVersion(
            id=version_id,
            dataset_id=dataset_id,
            version_no=1,
            storage_path=str(storage_path),
            normalized_payload_path=str(normalized_path),
            checksum=checksum,
            row_count=parsed.row_count,
            metadata_json=json.dumps({'preview': parsed.preview, 'warnings': parsed.warnings or []}),
        )
        import_record = ImportRecord(
            id=import_id,
            dataset_id=dataset_id,
            import_type='upload',
            original_filename=safe_name,
            storage_path=str(storage_path),
            parser_used=parsed.parser_used,
            media_type=media_type,
            byte_size=len(raw_bytes),
            checksum=checksum,
            status='normalized',
            details_json=json.dumps({'preview': parsed.preview, 'warnings': parsed.warnings or []}),
        )
        self.db.add_all([dataset, version, import_record])
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import.created', entity_type='import', entity_id=import_id, after={'dataset_id': dataset_id, 'filename': safe_name, 'parser': parsed.parser_used}))
        self.audit.record(AuditEventCreate(action='dataset.normalized', entity_type='dataset', entity_id=dataset_id, after={'dataset_version_id': version_id, 'type': parsed.normalized_payload['type']}))
        return self.get_import(import_id)

    def list_imports(self) -> list[dict]:
        rows = self.db.scalars(select(ImportRecord).order_by(desc(ImportRecord.created_at))).all()
        return [self._import_to_dict(row) for row in rows]

    def get_import(self, import_id: str) -> dict:
        row = self.db.get(ImportRecord, import_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Import not found')
        return self._import_to_dict(row)

    def list_datasets(self) -> list[dict]:
        rows = self.db.scalars(select(Dataset).order_by(desc(Dataset.updated_at))).all()
        return [self._dataset_to_dict(row) for row in rows]

    def get_dataset(self, dataset_id: str) -> dict:
        row = self.db.get(Dataset, dataset_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Dataset not found')
        return self._dataset_to_dict(row)

    def preview_dataset(self, dataset_id: str) -> dict:
        version = self._latest_version(dataset_id)
        metadata = json.loads(version.metadata_json or '{}')
        normalized_payload = self._load_normalized_payload(version)
        return {
            'dataset_id': dataset_id,
            'version_id': version.id,
            'preview': metadata.get('preview'),
            'normalized_payload': normalized_payload,
        }

    def normalize_dataset(self, dataset_id: str) -> dict:
        dataset = self.db.get(Dataset, dataset_id)
        if dataset is None:
            raise HTTPException(status_code=404, detail='Dataset not found')
        latest = self._latest_version(dataset_id)
        parsed = self.parser.parse(Path(latest.storage_path), media_type=dataset.media_type)
        normalized_path = Path(latest.normalized_payload_path) if latest.normalized_payload_path else self.settings.resolve_path(self.settings.storage.artifacts_dir) / f'{latest.id}_normalized.json'
        normalized_path.write_text(json.dumps(parsed.normalized_payload, indent=2, ensure_ascii=False), encoding='utf-8')
        latest.normalized_payload_path = str(normalized_path)
        latest.row_count = parsed.row_count
        latest.metadata_json = json.dumps({'preview': parsed.preview, 'warnings': parsed.warnings or []})
        self.db.add(latest)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='dataset.normalized', entity_type='dataset', entity_id=dataset_id, after={'dataset_version_id': latest.id, 'type': parsed.normalized_payload['type']}))
        return self.preview_dataset(dataset_id)

    def _latest_version(self, dataset_id: str) -> DatasetVersion:
        row = self.db.scalar(select(DatasetVersion).where(DatasetVersion.dataset_id == dataset_id).order_by(desc(DatasetVersion.version_no)).limit(1))
        if row is None:
            raise HTTPException(status_code=404, detail='Dataset version not found')
        return row

    def _load_normalized_payload(self, version: DatasetVersion) -> dict:
        if not version.normalized_payload_path:
            return {}
        path = Path(version.normalized_payload_path)
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding='utf-8'))

    def _import_to_dict(self, row: ImportRecord) -> dict:
        return {
            'id': row.id,
            'dataset_id': row.dataset_id,
            'import_type': row.import_type,
            'original_filename': row.original_filename,
            'storage_path': row.storage_path,
            'parser_used': row.parser_used,
            'media_type': row.media_type,
            'byte_size': row.byte_size,
            'checksum': row.checksum,
            'status': row.status,
            'details': json.loads(row.details_json or '{}'),
            'created_at': row.created_at,
        }

    def _dataset_to_dict(self, row: Dataset) -> dict:
        latest_version = self._latest_version(row.id)
        return {
            'id': row.id,
            'name': row.name,
            'source_type': row.source_type,
            'source_ref': row.source_ref,
            'media_type': row.media_type,
            'latest_version_no': row.latest_version_no,
            'metadata': json.loads(row.metadata_json or '{}'),
            'latest_version': {
                'id': latest_version.id,
                'row_count': latest_version.row_count,
                'storage_path': latest_version.storage_path,
                'normalized_payload_path': latest_version.normalized_payload_path,
                'metadata': json.loads(latest_version.metadata_json or '{}'),
                'created_at': latest_version.created_at,
            },
            'created_at': row.created_at,
            'updated_at': row.updated_at,
        }
