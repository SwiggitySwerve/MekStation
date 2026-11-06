"""Regenerate only quirk metadata; immutable source and raw-byte gates fail closed."""
from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import shutil

from quirk_json import QUIRK_FIELDS, assert_quirk_only_change, patch_quirk_fields
from source_inventory import build_inventory
from source_reconciliation import find_source_exclusion, validate_source_exclusions

PIN = '50f7efef0c9f775b0258f8283525ed4f906e1985'
FAMILIES = ('aerospace', 'battlearmor', 'battlemechs', 'capital', 'infantry', 'protomechs', 'vehicles')


def source_records(repo: Path, extracted: Path) -> list[dict]:
    """Use converter owners, after attesting extracted bytes to immutable Git blobs."""
    from blk_common import extract_tags, get_string, remove_comments
    from blk_unit_fields import parse_quirk_fields
    from mtf_parser import MTFParser

    exclusions = json.loads(Path(__file__).with_name('source-load-exclusions.json').read_text())
    validate_source_exclusions(exclusions)
    inventory = build_inventory(repo, PIN, repository='https://github.com/MegaMek/mm-data')
    records = []
    parser = MTFParser()
    for entry in inventory['entries']:
        relative = entry['path'].removeprefix('data/mekfiles/')
        if entry['kind'] != 'source' or find_source_exclusion(relative, exclusions):
            continue
        path = extracted / relative
        raw = path.read_bytes().replace(b'\r\n', b'\n')
        if hashlib.sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError(f'Pinned source hash mismatch: {relative}')
        if entry['format'] == 'mtf':
            unit = parser.parse_file(str(path))
            if unit is None:
                raise ValueError(f'Cannot convert source metadata: {relative}')
            chassis, model = unit.chassis, unit.model
            fields = {key: getattr(unit, key) for key in sorted(QUIRK_FIELDS) if getattr(unit, key)}
        else:
            tags = extract_tags(remove_comments(raw.decode('utf8')))
            chassis, model = get_string(tags, 'Name', 'name'), get_string(tags, 'Model', 'model') or ''
            fields = parse_quirk_fields(tags)
        if fields:
            records.append({'path': relative, 'sha256': entry['sha256'], 'chassis': chassis,
                            'model': model, 'fields': fields})
    return records


def _counts(documents):
    documents = list(documents)
    return {'unitQuirkFiles': sum(bool(d.get('quirks')) for d in documents),
            'weaponQuirkFiles': sum(bool(d.get('weaponQuirks')) for d in documents),
            'weaponQuirkEntries': sum(len(items) for d in documents for items in d.get('weaponQuirks', {}).values())}


def plan_family(baseline: Path, family: str, records: list[dict]):
    """Join exact design identities, disambiguating duplicates by source filename."""
    indexed = defaultdict(list)
    for record in records:
        indexed[(record['chassis'], record['model'])].append(record)
    units, matched = {}, set()
    for group in FAMILIES:
        for path in sorted((baseline / group).rglob('*.json')):
            doc = json.loads(path.read_bytes())
            if isinstance(doc, dict) and 'id' in doc and 'unitType' in doc:
                units[path] = doc
                matched.add((doc.get('chassis'), doc.get('model', '')))
    unmatched = set(indexed) - matched
    if unmatched:
        raise ValueError(f'Unmatched source identities: {sorted(unmatched)}')
    plan, expected, actual = {}, [], []
    for path, doc in units.items():
        if not path.is_relative_to(baseline / family):
            continue
        candidates = indexed.get((doc.get('chassis'), doc.get('model', '')), [])
        if len(candidates) > 1:
            filenames = [r for r in candidates if Path(r['path']).stem == path.stem]
            if len(filenames) == 1:
                candidates = filenames
            elif any(r['fields'] != candidates[0]['fields'] for r in candidates):
                raise ValueError(f'Ambiguous source metadata: {path}')
        fields = candidates[0]['fields'] if candidates else {}
        # Absent source fields must not silently preserve stale canonical metadata.
        if any(doc.get(key) and not fields.get(key) for key in QUIRK_FIELDS):
            raise ValueError(f'Canonical quirk metadata has no source: {path}')
        before = path.read_bytes()
        after = patch_quirk_fields(before, fields)
        if before != after:
            plan[path.relative_to(baseline / family).as_posix()] = after
        expected.append(fields)
        actual.append(json.loads(after))
    source, output = _counts(expected), _counts(actual)
    if source != output:
        raise ValueError('Source/output quirk census differs')
    return plan, {'family': family, 'unitFiles': len(actual), 'changedFiles': len(plan),
                  'source': source, 'output': output}


def verify_tree(before: Path, after: Path, *, identical=False):
    """Gate every file, including manifests; only unit top-level quirks are exempt."""
    def files(root):
        return {p.relative_to(root) for p in root.rglob('*') if p.is_file()}
    paths = files(before)
    if paths != files(after):
        raise ValueError('File sets differ')
    for relative in sorted(paths):
        old, new = (before / relative).read_bytes(), (after / relative).read_bytes()
        if old == new:
            continue
        doc = json.loads(old) if relative.suffix == '.json' else None
        if identical or not isinstance(doc, dict) or not {'id', 'unitType'} <= doc.keys():
            raise ValueError(f'Non-quirk file changed: {relative}')
        assert_quirk_only_change(old, new)


def write_family(baseline: Path, output: Path, plan: dict[str, bytes]):
    if output.exists() or baseline.resolve().is_relative_to(output.resolve()) or output.resolve().is_relative_to(baseline.resolve()):
        raise ValueError('Output must be a new directory outside the baseline')
    if any(Path(key).is_absolute() or '..' in Path(key).parts or not (baseline / key).is_file() for key in plan):
        raise ValueError('Plan must contain only existing family files')
    shutil.copytree(baseline, output)
    for relative, raw in plan.items():
        (output / relative).write_bytes(raw)
    verify_tree(baseline, output)


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    commands = cli.add_subparsers(dest='command', required=True)
    generate = commands.add_parser('generate')
    for name in ('repo', 'extracted', 'baseline', 'output', 'report'):
        generate.add_argument('--' + name, required=True, type=Path)
    generate.add_argument('--family', required=True, choices=FAMILIES)
    verify = commands.add_parser('verify')
    verify.add_argument('--before', required=True, type=Path)
    verify.add_argument('--after', required=True, type=Path)
    verify.add_argument('--identical', action='store_true')
    args = cli.parse_args()
    if args.command == 'verify':
        verify_tree(args.before, args.after, identical=args.identical)
    else:
        plan, report = plan_family(args.baseline, args.family, source_records(args.repo, args.extracted))
        write_family(args.baseline / args.family, args.output, plan)
        args.report.write_text(json.dumps({'mmDataPin': PIN, **report}, indent=2) + '\n')
        print(json.dumps(report))


if __name__ == '__main__':
    main()
