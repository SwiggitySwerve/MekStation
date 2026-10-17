"""Source-verified encoding-only regeneration of an existing MTF corpus.

Keep shipped IDs and subsequent construction corrections. Every changed value
must be a reversible Latin-1 misreading of its freshly parsed UTF-8 source.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from mtf_parser import MTFParser


# Match complete UTF-8 byte sequences represented as Latin-1 code points.
# Matching individual sequences also preserves already-correct Unicode nearby.
MISREAD_UTF8 = re.compile(
    r"[\u00c2-\u00df][\u0080-\u00bf]"
    r"|[\u00e0-\u00ef][\u0080-\u00bf]{2}"
    r"|[\u00f0-\u00f4][\u0080-\u00bf]{3}"
)


def repair_text(value: str) -> str:
    def decode(match: re.Match) -> str:
        try:
            return match[0].encode('latin-1').decode('utf-8')
        except UnicodeDecodeError:
            return match[0]

    return MISREAD_UTF8.sub(decode, value)


def regenerate_value(existing: Any, source: Any) -> Any:
    """Replace only corrupt string values, failing on source disagreement."""
    if isinstance(existing, dict):
        return {
            key: regenerate_value(value, source.get(key) if isinstance(source, dict) else None)
            for key, value in existing.items()
        }
    if isinstance(existing, str):
        repaired = repair_text(existing)
        # The old parser stripped the final NBSP byte of a misread U+00A0,
        # leaving an orphan A-circumflex. Require an exact source match before
        # dropping that suffix; do not strip arbitrary legitimate characters.
        if repaired.endswith('\u00c2') and repaired[:-1] == source:
            return source
        if repaired != existing:
            if repaired != source:
                raise ValueError('Encoding repair differs from the UTF-8 MTF source')
            return source
    return existing


def regenerate_text(source_dir: str, output_dir: str, *, check: bool = False) -> int:
    # Local import avoids a module cycle through the converter's CLI.
    from mtf_converter import dataclass_to_dict, write_json_file

    root = Path(output_dir)
    index_path = root / 'index.json'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    parser = MTFParser()
    sources = {}
    for mtf in sorted(Path(source_dir).rglob('*.mtf')):
        unit = parser.parse_file(str(mtf))
        if unit is None:
            raise ValueError(f'Cannot parse source: {mtf}')
        key = (unit.chassis, unit.model)
        sources.setdefault(key, []).append(dataclass_to_dict(unit))
    if not sources:
        raise ValueError('No MTF sources found')

    # Validate the entire plan before writing or renaming anything.
    writes = []
    paths = set()
    ids = set()
    index_ids = set()
    for entry in index['units']:
        old_path = root / entry['path']
        if not old_path.resolve().is_relative_to(root.resolve()):
            raise ValueError(f'Unit path escapes output directory: {old_path}')
        existing = json.loads(old_path.read_text(encoding='utf-8'))
        # Eight legacy index keys differ from the ASCII IDs inside their unit
        # files. Both have shipped; retain both rather than migrate saved refs.
        if existing['id'] in ids or entry['id'] in index_ids:
            raise ValueError(f'Duplicate unit ID: {old_path}')
        ids.add(existing['id'])
        index_ids.add(entry['id'])
        key = (repair_text(existing['chassis']), repair_text(existing['model']))
        candidates = sources.get(key)
        if candidates is None:
            raise ValueError(f'No MTF source for {old_path}')
        # Duplicate source variants can share names. All accepted repairs must
        # produce the same text; unrelated construction differences are ignored.
        updates = []
        for source in candidates:
            updated = dict(existing)
            try:
                for field in ('chassis', 'model', 'fluff'):
                    if field in existing:
                        updated[field] = regenerate_value(existing[field], source.get(field))
            except ValueError:
                continue
            updates.append(updated)
        if not updates or any(value != updates[0] for value in updates):
            raise ValueError(f'No unambiguous source-verified encoding repair: {old_path}')
        updated = updates[0]
        new_path = old_path.with_name(repair_text(old_path.name))
        if new_path in paths or (new_path != old_path and new_path.exists()):
            raise ValueError(f'Unit filename collision: {new_path}')
        paths.add(new_path)
        if updated != existing or new_path != old_path:
            writes.append((old_path, new_path, updated))
        entry['chassis'] = updated['chassis']
        entry['model'] = updated['model']
        entry['path'] = new_path.relative_to(root).as_posix()

    actual_paths = {p for p in root.rglob('*.json') if p != index_path}
    expected_paths = {root / entry['path'] for entry in json.loads(index_path.read_text(encoding='utf-8'))['units']}
    if actual_paths != expected_paths or index['totalUnits'] != len(ids):
        raise ValueError('Index does not describe the complete unit corpus')
    index_changed = index != json.loads(index_path.read_text(encoding='utf-8'))
    changes = len(writes) + int(index_changed)
    if not check:
        for old_path, new_path, unit in writes:
            if old_path != new_path:
                old_path.rename(new_path)
            write_json_file(new_path, unit)
        if index_changed:
            write_json_file(index_path, index)
    return changes
