from __future__ import annotations

import csv
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
            return self._parse_csv(path)
        if suffix == '.json':
            return self._parse_json(path)
        if suffix in {'.txt', '.md'}:
            return self._parse_text(path, 'markdown' if suffix == '.md' else 'text')
        if suffix == '.eml':
            return self._parse_eml(path)
        if suffix == '.msg':
            return self._unsupported(path, 'msg_optional_dependency')
        if suffix == '.xlsx':
            return self._unsupported(path, 'xlsx_optional_dependency')
        if suffix == '.docx':
            return self._unsupported(path, 'docx_optional_dependency')
        if suffix == '.pdf':
            return self._unsupported(path, 'pdf_optional_dependency')
        return self._parse_binary(path)

    def _parse_csv(self, path: Path) -> ParsedContent:
        with path.open('r', encoding='utf-8', newline='') as handle:
            reader = csv.DictReader(handle)
            items = list(reader)
        payload = {
            'type': 'record_set',
            'title': path.stem,
            'items': items,
            'metadata': {'source_format': 'csv', 'row_count': len(items)},
        }
        return ParsedContent('csv', payload, {'type': 'record_set', 'sample_items': items[:20]}, row_count=len(items))

    def _parse_json(self, path: Path) -> ParsedContent:
        data = json.loads(path.read_text(encoding='utf-8'))
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
            items = [{'name': path.name, 'text': str(data)}]
            row_count = 1
        payload = {
            'type': payload_type,
            'title': path.stem,
            'items': items,
            'metadata': {'source_format': 'json', 'row_count': row_count},
        }
        return ParsedContent('json', payload, {'type': payload_type, 'sample_items': items[:20]}, row_count=row_count)

    def _parse_text(self, path: Path, source_format: str) -> ParsedContent:
        text = path.read_text(encoding='utf-8', errors='replace')
        payload = {
            'type': 'text_bundle',
            'title': path.stem,
            'items': [{'name': path.name, 'text': text}],
            'metadata': {'source_format': source_format, 'character_count': len(text)},
        }
        return ParsedContent('text', payload, {'type': 'text_bundle', 'sample_items': [{'name': path.name, 'text': text[:4000]}]}, row_count=1)

    def _parse_eml(self, path: Path) -> ParsedContent:
        with path.open('rb') as handle:
            message = BytesParser(policy=policy.default).parse(handle)
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
            'title': path.stem,
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
