"""Append tagged pinned Java totals; preserve retained reference entry bytes.

Run with --oracle, --cache, --index, --removed-ids, --mekfiles and --output.
This transports reference facts; strict source comparison remains the BV proof.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SOURCE = 'pinned-java-48fcb2f6'


def entry_spans(cache):
    text = cache.decode('utf-8')
    match = re.search(r'(?m)^  "entries": \{', text)
    if not match:
        raise ValueError('Reference cache has no entries object')
    decoder, entries, position = json.JSONDecoder(), {}, match.end()
    while True:
        position = re.compile(r'\s*').match(text, position).end()
        if text[position] == '}':
            return match.end(), position, entries
        start = position
        key, position = decoder.raw_decode(text, position)
        position = re.compile(r'\s*:\s*').match(text, position).end()
        _, position = decoder.raw_decode(text, position)
        if key in entries:
            raise ValueError(f'Duplicate reference id: {key}')
        entries[key] = text[start:position]
        position = re.compile(r'\s*').match(text, position).end()
        if text[position] == ',':
            position += 1


def append_references(cache, oracle, index, removed_ids, mekfiles):
    start, end, entries = entry_spans(cache)
    ids = {row['id'] for row in index['units']}
    if ids.intersection(removed_ids):
        raise ValueError('Cannot remove a reference still in the catalog')
    references = {}
    for row in oracle:
        if row['path'].startswith('meks/'):
            key = (row['chassis'], row['model'] or 'Unknown')
            references.setdefault(key, []).append(row)
    root = mekfiles.resolve()
    for unit in sorted(index['units'], key=lambda row: row['id']):
        if unit['id'] in entries:
            continue
        matches = references.get((unit['chassis'], unit['model']), [])
        if len(matches) != 1:
            raise ValueError(f'No unique pinned reference for {unit["id"]}')
        row = matches[0]
        source = (root / row['path']).resolve()
        if not source.is_relative_to(root):
            raise ValueError('Oracle path escapes the pinned source root')
        digest = hashlib.sha256(source.read_bytes().replace(b'\r\n', b'\n')).hexdigest()
        if digest != row['sha256']:
            raise ValueError(f'Source hash mismatch: {row["path"]}')
        total = row['battleValue']['total']
        if type(total) is not int or total <= 0:
            raise ValueError(f'Invalid Java BV: {unit["id"]}')
        entry = {'megamekBV': total, 'source': SOURCE,
                 'sourcePath': row['path'], 'sourceSha256': digest}
        entries[unit['id']] = json.dumps(unit['id'], ensure_ascii=False) + ': ' + json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n    ')
    text = cache.decode('utf-8')
    newline = '\r\n' if '\r\n' in text else '\n'
    retained = [raw for key, raw in entries.items() if key not in removed_ids]
    body = (',' + newline).join('    ' + raw for raw in retained)
    return (text[:start] + newline + body + newline + '  ' + text[end:]).encode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('oracle', 'cache', 'index', 'removed-ids', 'mekfiles', 'output'):
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args()
    oracle = [json.loads(line) for line in args.oracle.read_text(encoding='utf-8').splitlines() if line.strip()]
    result = append_references(args.cache.read_bytes(), oracle,
        json.loads(args.index.read_text(encoding='utf-8')),
        json.loads(args.removed_ids.read_text(encoding='utf-8')), args.mekfiles)
    args.output.write_bytes(result)


if __name__ == '__main__':
    main()
