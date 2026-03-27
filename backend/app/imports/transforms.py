from __future__ import annotations

from typing import Any

from app.imports.parsers import ParsedContent


class TransformError(Exception):
    pass


class TransformEngine:
    def apply(self, parsed: ParsedContent, rules: dict[str, Any] | None) -> ParsedContent:
        rules = rules or {}
        if not rules:
            return parsed

        payload_type = parsed.normalized_payload.get('type')
        items = parsed.normalized_payload.get('items')
        if payload_type != 'record_set' or not isinstance(items, list) or not all(isinstance(item, dict) for item in items[:20]):
            warnings = list(parsed.warnings or [])
            warnings.append('transform_rules skipped: only record_set payloads support transforms in this MVP')
            return ParsedContent(
                parser_used=parsed.parser_used,
                normalized_payload=parsed.normalized_payload,
                preview=parsed.preview,
                row_count=parsed.row_count,
                warnings=warnings,
            )

        rename_fields = self._as_mapping(rules.get('rename_fields'))
        drop_fields = self._as_string_list(rules.get('drop_fields'))
        keep_fields = self._as_string_list(rules.get('keep_fields'))
        add_static_fields = self._as_mapping(rules.get('add_static_fields'))

        transformed: list[dict[str, Any]] = []
        for item in items:
            row = dict(item)
            if rename_fields:
                row = {rename_fields.get(key, key): value for key, value in row.items()}
            if drop_fields:
                row = {key: value for key, value in row.items() if key not in drop_fields}
            if keep_fields:
                row = {key: value for key, value in row.items() if key in keep_fields}
            if add_static_fields:
                row.update(add_static_fields)
            transformed.append(row)

        metadata = dict(parsed.normalized_payload.get('metadata') or {})
        metadata['transform_rules_applied'] = {
            'rename_fields': rename_fields,
            'drop_fields': drop_fields,
            'keep_fields': keep_fields,
            'add_static_fields': add_static_fields,
        }
        metadata['row_count'] = len(transformed)

        payload = {
            **parsed.normalized_payload,
            'items': transformed,
            'metadata': metadata,
        }
        preview = {
            'type': 'record_set',
            'sample_items': transformed[:20],
            'transform_summary': {
                'original_fields': sorted({key for item in items for key in item.keys()}),
                'transformed_fields': sorted({key for item in transformed for key in item.keys()}),
                'row_count': len(transformed),
            },
        }
        return ParsedContent(
            parser_used=parsed.parser_used,
            normalized_payload=payload,
            preview=preview,
            row_count=len(transformed),
            warnings=parsed.warnings,
        )

    def _as_mapping(self, value: Any) -> dict[str, Any]:
        if value in (None, ''):
            return {}
        if not isinstance(value, dict):
            raise TransformError('transform rule must be an object')
        return {str(k): v for k, v in value.items()}

    def _as_string_list(self, value: Any) -> list[str]:
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise TransformError('transform rule must be a list')
        return [str(item) for item in value if str(item).strip()]
