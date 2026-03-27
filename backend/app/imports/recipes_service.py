from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventCreate
from app.audit.service import AuditService
from app.db.models import Dataset, ImportRecipe, ImportRun, SettingsEntry
from app.imports.fetchers import HttpImportFetcher
from app.imports.schemas import (
    ImportRecipeCreate,
    ImportRecipePreviewRequest,
    ImportRecipePreviewResponse,
    ImportRecipeRunResponse,
    ImportRecipeUpdate,
)
from app.imports.service import ImportService
from app.imports.transforms import TransformEngine, TransformError


class ImportRecipeService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)
        self.imports = ImportService(db)
        self.http_fetcher = HttpImportFetcher()
        self.transforms = TransformEngine()

    def list_recipes(self) -> list[dict]:
        rows = self.db.scalars(select(ImportRecipe).order_by(desc(ImportRecipe.updated_at), desc(ImportRecipe.created_at))).all()
        return [self._recipe_to_dict(row) for row in rows]

    def get_recipe(self, recipe_id: str) -> dict:
        row = self.db.get(ImportRecipe, recipe_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Import recipe not found')
        return self._recipe_to_dict(row)

    def create_recipe(self, payload: ImportRecipeCreate) -> dict:
        self._validate_recipe_targeting(payload.target_mode, payload.target_dataset_id, payload.dataset_name_template)
        self._validate_source(payload.source_type, payload.source_config)
        recipe = ImportRecipe(
            id=f'impr_{uuid4().hex}',
            name=payload.name.strip(),
            description=payload.description,
            enabled=1 if payload.enabled else 0,
            source_type=payload.source_type,
            source_config_json=json.dumps(payload.source_config),
            target_mode=payload.target_mode,
            target_dataset_id=payload.target_dataset_id,
            dataset_name_template=payload.dataset_name_template,
            parser_options_json=json.dumps(payload.parser_options),
            transform_rules_json=json.dumps(payload.transform_rules),
            preview_config_json=json.dumps(payload.preview_config),
        )
        self.db.add(recipe)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import_recipe.created', entity_type='import_recipe', entity_id=recipe.id, after={'name': recipe.name, 'target_mode': recipe.target_mode, 'target_dataset_id': recipe.target_dataset_id, 'source_type': recipe.source_type}))
        return self.get_recipe(recipe.id)

    def update_recipe(self, recipe_id: str, payload: ImportRecipeUpdate) -> dict:
        row = self.db.get(ImportRecipe, recipe_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Import recipe not found')

        if payload.name is not None:
            row.name = payload.name.strip()
        if payload.description is not None:
            row.description = payload.description
        if payload.enabled is not None:
            row.enabled = 1 if payload.enabled else 0
        if payload.source_type is not None:
            row.source_type = payload.source_type
        if payload.source_config is not None:
            row.source_config_json = json.dumps(payload.source_config)
        if payload.target_mode is not None:
            row.target_mode = payload.target_mode
        if payload.dataset_name_template is not None:
            row.dataset_name_template = payload.dataset_name_template
        if payload.target_mode == 'create_new_dataset':
            row.target_dataset_id = None
        elif payload.target_dataset_id is not None or payload.target_mode == 'append_to_dataset':
            row.target_dataset_id = payload.target_dataset_id
        if payload.parser_options is not None:
            row.parser_options_json = json.dumps(payload.parser_options)
        if payload.transform_rules is not None:
            row.transform_rules_json = json.dumps(payload.transform_rules)
        if payload.preview_config is not None:
            row.preview_config_json = json.dumps(payload.preview_config)

        self._validate_recipe_targeting(row.target_mode, row.target_dataset_id, row.dataset_name_template)
        self._validate_source(row.source_type, json.loads(row.source_config_json or '{}'))
        row.updated_at = self._now_iso()
        self.db.add(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import_recipe.updated', entity_type='import_recipe', entity_id=row.id, after={'name': row.name, 'target_mode': row.target_mode, 'target_dataset_id': row.target_dataset_id, 'source_type': row.source_type}))
        return self.get_recipe(recipe_id)

    def delete_recipe(self, recipe_id: str) -> dict:
        row = self.db.get(ImportRecipe, recipe_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Import recipe not found')
        response = self._recipe_to_dict(row)
        self.db.delete(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import_recipe.deleted', entity_type='import_recipe', entity_id=recipe_id, after={'name': response['name']}))
        return {'ok': True}

    def list_runs(self, recipe_id: str) -> dict:
        recipe = self.db.get(ImportRecipe, recipe_id)
        if recipe is None:
            raise HTTPException(status_code=404, detail='Import recipe not found')
        rows = self.db.scalars(select(ImportRun).where(ImportRun.recipe_id == recipe_id).order_by(desc(ImportRun.created_at))).all()
        return {'runs': [self._run_to_dict(row) for row in rows]}

    def get_run(self, run_id: str) -> dict:
        row = self.db.get(ImportRun, run_id)
        if row is None:
            raise HTTPException(status_code=404, detail='Import run not found')
        return self._run_to_dict(row)

    async def preview_recipe(self, payload: ImportRecipePreviewRequest) -> ImportRecipePreviewResponse:
        self._validate_source(payload.source_type, payload.source_config)
        acquired = await self._acquire_source(payload.source_type, payload.source_config)
        parsed = self.imports.parser.parse_bytes(
            acquired['content'],
            source_name=acquired['source_name'],
            media_type=acquired['media_type'],
            format_hint=str(payload.source_config.get('response_format_hint') or 'auto'),
        )
        try:
            parsed = self.transforms.apply(parsed, payload.transform_rules)
        except TransformError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return ImportRecipePreviewResponse(
            source_type=payload.source_type,
            parser_used=parsed.parser_used,
            media_type=acquired['media_type'],
            row_count=parsed.row_count,
            preview=parsed.preview,
            warnings=parsed.warnings or [],
            diagnostics=acquired.get('diagnostics') or {},
        )

    async def run_recipe(self, recipe_id: str, upload: UploadFile | None) -> ImportRecipeRunResponse:
        recipe = self.db.get(ImportRecipe, recipe_id)
        if recipe is None:
            raise HTTPException(status_code=404, detail='Import recipe not found')
        if not recipe.enabled:
            raise HTTPException(status_code=400, detail='Import recipe is disabled')

        source_config = json.loads(recipe.source_config_json or '{}')
        transform_rules = json.loads(recipe.transform_rules_json or '{}')
        self._validate_recipe_targeting(recipe.target_mode, recipe.target_dataset_id, recipe.dataset_name_template)
        self._validate_source(recipe.source_type, source_config)

        run = ImportRun(
            id=f'imprun_{uuid4().hex}',
            recipe_id=recipe.id,
            status='running',
            source_type=recipe.source_type,
            started_at=self._now_iso(),
            details_json=json.dumps({}),
        )
        self.db.add(run)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import_recipe.run_started', entity_type='import_run', entity_id=run.id, after={'recipe_id': recipe.id}))

        try:
            acquired = await self._acquire_source(recipe.source_type, source_config, upload=upload, run_id=run.id)
            run.original_filename = acquired.get('source_name')
            run.storage_path = acquired.get('storage_path')
            run.media_type = acquired.get('media_type')
            run.byte_size = acquired.get('byte_size')
            run.checksum = acquired.get('checksum')

            parsed = self.imports.parser.parse_bytes(
                acquired['content'],
                source_name=acquired['source_name'],
                media_type=acquired['media_type'],
                format_hint=str(source_config.get('response_format_hint') or 'auto'),
            )
            try:
                parsed = self.transforms.apply(parsed, transform_rules)
            except TransformError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            run.parser_used = parsed.parser_used
            run.warning_count = len(parsed.warnings or [])

            dataset_action = ''
            if recipe.target_mode == 'create_new_dataset':
                dataset = self.imports.create_dataset(
                    dataset_id=f'ds_{uuid4().hex}',
                    name=(recipe.dataset_name_template or recipe.name).strip(),
                    source_type='import_recipe',
                    source_ref=recipe.id,
                    media_type=acquired['media_type'],
                    metadata={'recipe_id': recipe.id, 'original_filename': acquired['source_name'], 'source_type': recipe.source_type},
                )
                self.db.add(dataset)
                dataset_action = 'created_dataset'
            else:
                dataset = self.db.get(Dataset, recipe.target_dataset_id)
                if dataset is None:
                    raise HTTPException(status_code=400, detail='Target dataset not found for append_to_dataset recipe')
                dataset.media_type = acquired['media_type']
                dataset.source_type = 'import_recipe'
                dataset.source_ref = recipe.id
                metadata = json.loads(dataset.metadata_json or '{}')
                metadata.update({'recipe_id': recipe.id, 'last_filename': acquired['source_name'], 'source_type': recipe.source_type})
                dataset.metadata_json = json.dumps(metadata)
                dataset.updated_at = self._now_iso()
                self.db.add(dataset)
                dataset_action = 'appended_version'

            if acquired.get('storage_path'):
                storage_path = Path(acquired['storage_path'])
            else:
                storage_path = self.imports.write_raw_artifact(run.id, acquired['source_name'], acquired['content'])
                run.storage_path = str(storage_path)

            version = self.imports.create_dataset_version(
                dataset=dataset,
                parsed=parsed,
                storage_path=storage_path,
                checksum=acquired['checksum'],
            )
            self.db.add(version)

            recipe.last_run_at = self._now_iso()
            recipe.last_run_status = 'success'
            recipe.updated_at = self._now_iso()
            self.db.add(recipe)

            run.dataset_id = dataset.id
            run.dataset_version_id = version.id
            run.status = 'success'
            run.finished_at = self._now_iso()
            run.details_json = json.dumps({
                'preview': parsed.preview,
                'warnings': parsed.warnings or [],
                'parser_used': parsed.parser_used,
                'row_count': parsed.row_count,
                'dataset_action': dataset_action,
                'target_dataset_id': dataset.id,
                'diagnostics': acquired.get('diagnostics') or {},
            })
            self.db.add(run)
            self.db.commit()

            self.audit.record(AuditEventCreate(action='dataset.version_created', entity_type='dataset', entity_id=dataset.id, after={'dataset_version_id': version.id, 'recipe_id': recipe.id, 'dataset_action': dataset_action}))
            self.audit.record(AuditEventCreate(action='import_recipe.run_succeeded', entity_type='import_run', entity_id=run.id, after={'recipe_id': recipe.id, 'dataset_id': dataset.id, 'dataset_version_id': version.id}))
            return ImportRecipeRunResponse(
                run_id=run.id,
                recipe_id=recipe.id,
                status='success',
                dataset_id=dataset.id,
                dataset_version_id=version.id,
                message=f'Imported {parsed.row_count if parsed.row_count is not None else "unknown"} rows into dataset {dataset.id} version {version.version_no}',
            )
        except Exception as exc:
            recipe.last_run_at = self._now_iso()
            recipe.last_run_status = 'failed'
            recipe.updated_at = self._now_iso()
            self.db.add(recipe)

            error_message = str(exc)
            diagnostics: dict = {}
            if isinstance(exc, HTTPException):
                if isinstance(exc.detail, str):
                    error_message = exc.detail
                elif isinstance(exc.detail, dict):
                    error_message = str(exc.detail.get('message') or error_message)
                    diagnostics = exc.detail.get('diagnostics') or {}

            run.status = 'failed'
            run.finished_at = self._now_iso()
            run.error_text = error_message
            details = json.loads(run.details_json or '{}')
            details['diagnostics'] = diagnostics or details.get('diagnostics') or {}
            run.details_json = json.dumps(details)
            self.db.add(run)
            self.db.commit()
            self.audit.record(AuditEventCreate(action='import_recipe.run_failed', entity_type='import_run', entity_id=run.id, after={'recipe_id': recipe.id, 'error': error_message}))
            if isinstance(exc, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=error_message) from exc

    async def _acquire_source(self, source_type: str, source_config: dict, *, upload: UploadFile | None = None, run_id: str | None = None) -> dict:
        if source_type == 'file_upload':
            if upload is None:
                raise HTTPException(status_code=400, detail='file is required for file_upload recipes')
            prefix = run_id or f'imp_{uuid4().hex}'
            storage = await self.imports.persist_upload(upload, prefix=prefix)
            content = Path(storage['storage_path']).read_bytes()
            return {
                'source_name': storage['safe_name'],
                'storage_path': str(storage['storage_path']),
                'media_type': storage['media_type'],
                'byte_size': storage['byte_size'],
                'checksum': storage['checksum'],
                'content': content,
                'diagnostics': {},
            }
        if source_type == 'http':
            result = await self.http_fetcher.fetch(
                url=str(source_config.get('url') or '').strip(),
                method=str(source_config.get('method') or 'GET'),
                headers=self._build_http_headers(source_config),
                timeout_seconds=int(source_config.get('timeout_seconds') or 15),
                body=source_config.get('body') or None,
            )
            source_name = self._http_source_name(source_config, result['media_type'])
            checksum = self.imports.compute_checksum(result['content'])
            return {
                'source_name': source_name,
                'storage_path': None,
                'media_type': result['media_type'],
                'byte_size': len(result['content']),
                'checksum': checksum,
                'content': result['content'],
                'diagnostics': result['diagnostics'],
            }
        raise HTTPException(status_code=400, detail=f'Unsupported recipe source_type: {source_type}')

    def _validate_recipe_targeting(self, target_mode: str, target_dataset_id: str | None, dataset_name_template: str | None) -> None:
        if target_mode not in {'create_new_dataset', 'append_to_dataset'}:
            raise HTTPException(status_code=400, detail=f'Unsupported target_mode: {target_mode}')
        if target_mode == 'append_to_dataset':
            if not target_dataset_id:
                raise HTTPException(status_code=400, detail='target_dataset_id is required when target_mode=append_to_dataset')
            if self.db.get(Dataset, target_dataset_id) is None:
                raise HTTPException(status_code=400, detail='Target dataset not found')
        if target_mode == 'create_new_dataset' and not (dataset_name_template or '').strip():
            raise HTTPException(status_code=400, detail='dataset_name_template is required when target_mode=create_new_dataset')

    def _validate_source(self, source_type: str, source_config: dict) -> None:
        if source_type not in {'file_upload', 'http'}:
            raise HTTPException(status_code=400, detail=f'Unsupported recipe source_type: {source_type}')
        if source_type == 'http':
            url = str(source_config.get('url') or '').strip()
            if not url:
                raise HTTPException(status_code=400, detail='source_config.url is required when source_type=http')
            method = str(source_config.get('method') or 'GET').upper()
            if method not in {'GET', 'POST'}:
                raise HTTPException(status_code=400, detail='source_config.method must be GET or POST')
            headers = source_config.get('headers') or {}
            if not isinstance(headers, dict):
                raise HTTPException(status_code=400, detail='source_config.headers must be an object')
            auth = source_config.get('auth') or {'mode': 'none'}
            if not isinstance(auth, dict):
                raise HTTPException(status_code=400, detail='source_config.auth must be an object')
            auth_mode = str(auth.get('mode') or 'none')
            if auth_mode not in {'none', 'bearer', 'custom_header', 'basic'}:
                raise HTTPException(status_code=400, detail='source_config.auth.mode must be none, bearer, custom_header, or basic')
            if auth_mode in {'bearer', 'custom_header', 'basic'} and not str(auth.get('secret_alias') or '').strip():
                raise HTTPException(status_code=400, detail='source_config.auth.secret_alias is required for authenticated HTTP recipes')
            if auth_mode == 'custom_header' and not str(auth.get('header_name') or '').strip():
                raise HTTPException(status_code=400, detail='source_config.auth.header_name is required for custom_header auth')
            if auth_mode == 'basic' and not str(auth.get('username') or '').strip():
                raise HTTPException(status_code=400, detail='source_config.auth.username is required for basic auth')
            try:
                timeout = int(source_config.get('timeout_seconds') or 15)
            except Exception as exc:
                raise HTTPException(status_code=400, detail='source_config.timeout_seconds must be an integer') from exc
            if timeout <= 0 or timeout > 300:
                raise HTTPException(status_code=400, detail='source_config.timeout_seconds must be between 1 and 300')
            hint = str(source_config.get('response_format_hint') or 'auto')
            if hint not in {'auto', 'json', 'csv', 'text'}:
                raise HTTPException(status_code=400, detail='source_config.response_format_hint must be auto, json, csv, or text')

    @staticmethod
    def _secret_setting_key(secret_alias: str) -> str:
        return f'secrets.{secret_alias}'

    def _resolve_secret_value(self, secret_alias: str | None) -> str | None:
        if not secret_alias:
            return None
        row = self.db.get(SettingsEntry, self._secret_setting_key(secret_alias))
        if row is not None:
            try:
                value = json.loads(row.value_json)
                if isinstance(value, str) and value:
                    return value
            except Exception:
                pass
        return None

    def _build_http_headers(self, source_config: dict) -> dict[str, str]:
        headers = {str(k): str(v) for k, v in (source_config.get('headers') or {}).items()}
        auth = source_config.get('auth') or {'mode': 'none'}
        mode = str(auth.get('mode') or 'none')
        if mode == 'none':
            return headers
        secret_alias = str(auth.get('secret_alias') or '').strip()
        secret_value = self._resolve_secret_value(secret_alias)
        if not secret_value:
            raise HTTPException(status_code=400, detail={'message': f'No saved secret found for alias {secret_alias}', 'type': 'auth_error'})
        if mode == 'bearer':
            headers['Authorization'] = f'Bearer {secret_value}'
        elif mode == 'custom_header':
            headers[str(auth.get('header_name') or 'X-API-Key')] = secret_value
        elif mode == 'basic':
            import base64
            username = str(auth.get('username') or '')
            token = base64.b64encode(f'{username}:{secret_value}'.encode('utf-8')).decode('ascii')
            headers['Authorization'] = f'Basic {token}'
        return headers

    def _recipe_to_dict(self, row: ImportRecipe) -> dict:
        dataset_name = None
        if row.target_dataset_id:
            dataset = self.db.get(Dataset, row.target_dataset_id)
            dataset_name = dataset.name if dataset else None
        return {
            'id': row.id,
            'name': row.name,
            'description': row.description,
            'enabled': bool(row.enabled),
            'source_type': row.source_type,
            'source_config': json.loads(row.source_config_json or '{}'),
            'target_mode': row.target_mode,
            'target_dataset_id': row.target_dataset_id,
            'target_dataset_name': dataset_name,
            'dataset_name_template': row.dataset_name_template,
            'parser_options': json.loads(row.parser_options_json or '{}'),
            'transform_rules': json.loads(row.transform_rules_json or '{}'),
            'preview_config': json.loads(row.preview_config_json or '{}'),
            'last_run_at': row.last_run_at,
            'last_run_status': row.last_run_status,
            'created_at': row.created_at,
            'updated_at': row.updated_at,
        }

    def _run_to_dict(self, row: ImportRun) -> dict:
        return {
            'id': row.id,
            'recipe_id': row.recipe_id,
            'dataset_id': row.dataset_id,
            'dataset_version_id': row.dataset_version_id,
            'status': row.status,
            'source_type': row.source_type,
            'original_filename': row.original_filename,
            'storage_path': row.storage_path,
            'parser_used': row.parser_used,
            'media_type': row.media_type,
            'byte_size': row.byte_size,
            'checksum': row.checksum,
            'warning_count': row.warning_count,
            'error_text': row.error_text,
            'details': json.loads(row.details_json or '{}'),
            'started_at': row.started_at,
            'finished_at': row.finished_at,
            'created_at': row.created_at,
        }

    def _http_source_name(self, source_config: dict, media_type: str | None) -> str:
        url = str(source_config.get('url') or 'http-import')
        hint = str(source_config.get('response_format_hint') or 'auto')
        path_name = Path(url.split('?', 1)[0]).name or 'http-import'
        if '.' in path_name:
            return path_name
        extension = {
            'json': '.json',
            'csv': '.csv',
            'text': '.txt',
        }.get(hint)
        if extension:
            return f'{path_name}{extension}'
        media = (media_type or '').lower()
        if 'json' in media:
            return f'{path_name}.json'
        if 'csv' in media:
            return f'{path_name}.csv'
        if media.startswith('text/'):
            return f'{path_name}.txt'
        return path_name

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(UTC).isoformat()
