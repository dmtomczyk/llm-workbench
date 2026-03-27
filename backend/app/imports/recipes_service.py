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
from app.db.models import Dataset, ImportRecipe, ImportRun
from app.imports.schemas import ImportRecipeCreate, ImportRecipeRunResponse, ImportRecipeUpdate
from app.imports.service import ImportService


class ImportRecipeService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)
        self.imports = ImportService(db)

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
        recipe = ImportRecipe(
            id=f'impr_{uuid4().hex}',
            name=payload.name.strip(),
            description=payload.description,
            enabled=1 if payload.enabled else 0,
            source_type=payload.source_type,
            target_mode=payload.target_mode,
            target_dataset_id=payload.target_dataset_id,
            dataset_name_template=payload.dataset_name_template,
            parser_options_json=json.dumps(payload.parser_options),
            transform_rules_json=json.dumps(payload.transform_rules),
            preview_config_json=json.dumps(payload.preview_config),
        )
        self.db.add(recipe)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import_recipe.created', entity_type='import_recipe', entity_id=recipe.id, after={'name': recipe.name, 'target_mode': recipe.target_mode, 'target_dataset_id': recipe.target_dataset_id}))
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
        row.updated_at = self._now_iso()
        self.db.add(row)
        self.db.commit()
        self.audit.record(AuditEventCreate(action='import_recipe.updated', entity_type='import_recipe', entity_id=row.id, after={'name': row.name, 'target_mode': row.target_mode, 'target_dataset_id': row.target_dataset_id}))
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

    async def run_recipe(self, recipe_id: str, upload: UploadFile) -> ImportRecipeRunResponse:
        recipe = self.db.get(ImportRecipe, recipe_id)
        if recipe is None:
            raise HTTPException(status_code=404, detail='Import recipe not found')
        if not recipe.enabled:
            raise HTTPException(status_code=400, detail='Import recipe is disabled')
        if recipe.source_type != 'file_upload':
            raise HTTPException(status_code=400, detail=f'Unsupported recipe source_type: {recipe.source_type}')

        self._validate_recipe_targeting(recipe.target_mode, recipe.target_dataset_id, recipe.dataset_name_template)

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
            storage = await self.imports.persist_upload(upload, prefix=run.id)
            run.original_filename = storage['safe_name']
            run.storage_path = str(storage['storage_path'])
            run.media_type = storage['media_type']
            run.byte_size = storage['byte_size']
            run.checksum = storage['checksum']

            parsed = self.imports.parse_stored_file(storage['storage_path'], media_type=storage['media_type'])
            run.parser_used = parsed.parser_used
            run.warning_count = len(parsed.warnings or [])

            dataset_action = ''
            if recipe.target_mode == 'create_new_dataset':
                dataset = self.imports.create_dataset(
                    dataset_id=f'ds_{uuid4().hex}',
                    name=(recipe.dataset_name_template or recipe.name).strip(),
                    source_type='import_recipe',
                    source_ref=recipe.id,
                    media_type=storage['media_type'],
                    metadata={'recipe_id': recipe.id, 'original_filename': storage['safe_name']},
                )
                self.db.add(dataset)
                dataset_action = 'created_dataset'
            else:
                dataset = self.db.get(Dataset, recipe.target_dataset_id)
                if dataset is None:
                    raise HTTPException(status_code=400, detail='Target dataset not found for append_to_dataset recipe')
                dataset.media_type = storage['media_type']
                dataset.source_type = 'import_recipe'
                dataset.source_ref = recipe.id
                metadata = json.loads(dataset.metadata_json or '{}')
                metadata.update({'recipe_id': recipe.id, 'last_filename': storage['safe_name']})
                dataset.metadata_json = json.dumps(metadata)
                dataset.updated_at = self._now_iso()
                self.db.add(dataset)
                dataset_action = 'appended_version'

            version = self.imports.create_dataset_version(
                dataset=dataset,
                parsed=parsed,
                storage_path=storage['storage_path'],
                checksum=storage['checksum'],
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

            run.status = 'failed'
            run.finished_at = self._now_iso()
            run.error_text = str(exc)
            if not run.details_json:
                run.details_json = json.dumps({})
            self.db.add(run)
            self.db.commit()
            self.audit.record(AuditEventCreate(action='import_recipe.run_failed', entity_type='import_run', entity_id=run.id, after={'recipe_id': recipe.id, 'error': str(exc)}))
            if isinstance(exc, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=str(exc)) from exc

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

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(UTC).isoformat()
