from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


SourceType = Literal['file_upload', 'http']
TargetMode = Literal['create_new_dataset', 'append_to_dataset']
RunStatus = Literal['created', 'running', 'success', 'failed']
ResponseFormatHint = Literal['auto', 'json', 'csv', 'text']


class ImportRecipeCreate(BaseModel):
    name: str
    description: str | None = None
    enabled: bool = True
    source_type: SourceType = 'file_upload'
    source_config: dict[str, Any] = Field(default_factory=dict)
    target_mode: TargetMode
    target_dataset_id: str | None = None
    dataset_name_template: str | None = None
    parser_options: dict[str, Any] = Field(default_factory=dict)
    transform_rules: dict[str, Any] = Field(default_factory=dict)
    preview_config: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode='after')
    def validate_targeting(self) -> 'ImportRecipeCreate':
        if self.target_mode == 'append_to_dataset' and not self.target_dataset_id:
            raise ValueError('target_dataset_id is required when target_mode=append_to_dataset')
        if self.target_mode == 'create_new_dataset' and not (self.dataset_name_template or '').strip():
            raise ValueError('dataset_name_template is required when target_mode=create_new_dataset')
        if self.source_type == 'http' and not (self.source_config.get('url') or '').strip():
            raise ValueError('source_config.url is required when source_type=http')
        return self


class ImportRecipeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    enabled: bool | None = None
    source_type: SourceType | None = None
    source_config: dict[str, Any] | None = None
    target_mode: TargetMode | None = None
    target_dataset_id: str | None = None
    dataset_name_template: str | None = None
    parser_options: dict[str, Any] | None = None
    transform_rules: dict[str, Any] | None = None
    preview_config: dict[str, Any] | None = None


class ImportRecipeRead(BaseModel):
    id: str
    name: str
    description: str | None = None
    enabled: bool
    source_type: SourceType
    source_config: dict[str, Any] = Field(default_factory=dict)
    target_mode: TargetMode
    target_dataset_id: str | None = None
    target_dataset_name: str | None = None
    dataset_name_template: str | None = None
    parser_options: dict[str, Any] = Field(default_factory=dict)
    transform_rules: dict[str, Any] = Field(default_factory=dict)
    preview_config: dict[str, Any] = Field(default_factory=dict)
    last_run_at: str | None = None
    last_run_status: str | None = None
    created_at: str
    updated_at: str


class ImportRunRead(BaseModel):
    id: str
    recipe_id: str
    dataset_id: str | None = None
    dataset_version_id: str | None = None
    status: RunStatus
    source_type: SourceType
    original_filename: str | None = None
    storage_path: str | None = None
    parser_used: str | None = None
    media_type: str | None = None
    byte_size: int | None = None
    checksum: str | None = None
    warning_count: int = 0
    error_text: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    started_at: str | None = None
    finished_at: str | None = None
    created_at: str


class ImportRunsResponse(BaseModel):
    runs: list[ImportRunRead] = Field(default_factory=list)


class ImportRecipeRunResponse(BaseModel):
    ok: bool = True
    run_id: str
    recipe_id: str
    status: RunStatus
    dataset_id: str | None = None
    dataset_version_id: str | None = None
    message: str | None = None


class ImportRecipePreviewRequest(BaseModel):
    source_type: SourceType
    source_config: dict[str, Any] = Field(default_factory=dict)
    parser_options: dict[str, Any] = Field(default_factory=dict)
    transform_rules: dict[str, Any] = Field(default_factory=dict)
    preview_config: dict[str, Any] = Field(default_factory=dict)


class ImportRecipePreviewResponse(BaseModel):
    ok: bool = True
    source_type: SourceType
    parser_used: str
    media_type: str | None = None
    row_count: int | None = None
    preview: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    diagnostics: dict[str, Any] = Field(default_factory=dict)
