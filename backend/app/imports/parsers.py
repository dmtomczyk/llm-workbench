from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from email import policy
from email.parser import BytesParser
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class ParsedContent:
    parser_used: str
    normalized_payload: dict[str, Any]
    preview: dict[str, Any]
    row_count: int | None = None
    warnings: list[str] | None = None


class ParseError(Exception):
    pass


class FileParser:
    def parse(self, path: Path, media_type: str | None = None) -> ParsedContent:
        suffix = path.suffix.lower()
        if suffix == '.csv':
            return self._parse_csv_text(path.read_text(encoding='utf-8', errors='replace'), title=path.stem)
        if suffix == '.json':
            return self._parse_json_data(json.loads(path.read_text(encoding='utf-8')), title=path.stem)
        if suffix in {'.txt', '.md'}:
            return self._parse_text_content(path.read_text(encoding='utf-8', errors='replace'), title=path.stem, source_format='markdown' if suffix == '.md' else 'text', item_name=path.name)
        if suffix == '.eml':
            return self._parse_eml_bytes(path.read_bytes(), title=path.stem)
        if suffix == '.msg':
            return self._unsupported(path, 'msg_optional_dependency')
        if suffix == '.xlsx':
            return self._unsupported(path, 'xlsx_optional_dependency')
        if suffix == '.docx':
            return self._unsupported(path, 'docx_optional_dependency')
        if suffix == '.pdf':
            return self._unsupported(path, 'pdf_optional_dependency')
        return self._parse_binary(path)

    def parse_bytes(self, raw_bytes: bytes, *, source_name: str, media_type: str | None = None, format_hint: str = 'auto') -> ParsedContent:
        suffix = Path(source_name).suffix.lower()
        chosen = (format_hint or 'auto').lower()
        media = (media_type or '').lower()
        if chosen == 'csv' or suffix == '.csv' or 'text/csv' in media:
            return self._parse_csv_text(raw_bytes.decode('utf-8', errors='replace'), title=Path(source_name).stem)
        if chosen == 'json' or suffix == '.json' or 'application/json' in media or media.endswith('+json'):
            return self._parse_json_data(json.loads(raw_bytes.decode('utf-8', errors='replace')), title=Path(source_name).stem)
        if chosen == 'text' or suffix in {'.txt', '.md'} or media.startswith('text/'):
            source_format = 'markdown' if suffix == '.md' or 'markdown' in media else 'text'
            return self._parse_text_content(raw_bytes.decode('utf-8', errors='replace'), title=Path(source_name).stem, source_format=source_format, item_name=source_name)
        return ParsedContent(
            'binary',
            {
                'type': 'binary_artifact',
                'title': Path(source_name).stem,
                'items': [{'name': source_name}],
                'metadata': {'source_format': 'binary'},
            },
            {'type': 'binary_artifact', 'sample_items': [{'name': source_name}]},
            row_count=1,
        )

    def _parse_csv_text(self, text: str, *, title: str) -> ParsedContent:
        reader = csv.DictReader(io.StringIO(text))
        items = list(reader)
        payload = {
            'type': 'record_set',
            'title': title,
            'items': items,
            'metadata': {'source_format': 'csv', 'row_count': len(items)},
        }
        return ParsedContent('csv', payload, {'type': 'record_set', 'sample_items': items[:20]}, row_count=len(items))

    def _parse_json_data(self, data: Any, *, title: str) -> ParsedContent:
        if isinstance(data, list):
            payload_type = 'record_set' if all(isinstance(item, dict) for item in data[:20]) else 'mixed_bundle'
            items = data
            row_count = len(data)
        elif isinstance(data, dict):
            payload_type = 'mixed_bundle'
            items = [data]
            row_count = len(data)
        else:
            payload_type = 'text_bundle'
            items = [{'name': title, 'text': str(data)}]
            row_count = 1
        payload = {
            'type': payload_type,
            'title': title,
            'items': items,
            'metadata': {'source_format': 'json', 'row_count': row_count},
        }
        return ParsedContent('json', payload, {'type': payload_type, 'sample_items': items[:20]}, row_count=row_count)

    def _parse_text_content(self, text: str, *, title: str, source_format: str, item_name: str) -> ParsedContent:
        payload = {
            'type': 'text_bundle',
            'title': title,
            'items': [{'name': item_name, 'text': text}],
            'metadata': {'source_format': source_format, 'character_count': len(text)},
        }
        return ParsedContent('text', payload, {'type': 'text_bundle', 'sample_items': [{'name': item_name, 'text': text[:4000]}]}, row_count=1)

    def _parse_eml_bytes(self, raw_bytes: bytes, *, title: str) -> ParsedContent:
        message = BytesParser(policy=policy.default).parsebytes(raw_bytes)
        text_parts: list[str] = []
        attachments: list[dict[str, Any]] = []
        for part in message.walk():
            content_disposition = part.get_content_disposition()
            if content_disposition == 'attachment':
                attachments.append({'filename': part.get_filename(), 'content_type': part.get_content_type()})
                continue
            if part.get_content_type() == 'text/plain':
                text_parts.append(part.get_content())
        body = '\n\n'.join(part for part in text_parts if part)
        item = {
            'subject': message.get('subject'),
            'from': message.get('from'),
            'to': message.get('to'),
            'cc': message.get('cc'),
            'date': message.get('date'),
            'text': body,
            'attachments': attachments,
        }
        payload = {
            'type': 'document_set',
            'title': title,
            'items': [item],
            'metadata': {'source_format': 'eml', 'attachment_count': len(attachments)},
        }
        return ParsedContent('eml', payload, {'type': 'document_set', 'sample_items': [item]}, row_count=1)

    def _parse_binary(self, path: Path) -> ParsedContent:
        payload = {
            'type': 'binary_artifact',
            'title': path.stem,
            'items': [{'name': path.name, 'path': str(path)}],
            'metadata': {'source_format': 'binary'},
        }
        return ParsedContent('binary', payload, {'type': 'binary_artifact', 'sample_items': payload['items']}, row_count=1)

    def _unsupported(self, path: Path, parser_name: str) -> ParsedContent:
        payload = {
            'type': 'mixed_bundle',
            'title': path.stem,
            'items': [{'name': path.name, 'message': f'{parser_name} not installed yet'}],
            'metadata': {'source_format': path.suffix.lower().lstrip('.'), 'parser_status': 'optional_dependency_missing'},
        }
        return ParsedContent(parser_name, payload, {'type': 'mixed_bundle', 'sample_items': payload['items']}, row_count=1, warnings=[f'{parser_name} not installed'])
