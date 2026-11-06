"""Join immutable source entries to external Java loads; never infer a load."""
from collections import Counter, defaultdict
import re

SOURCE_ROOT = 'data/mekfiles'
ROOT = SOURCE_ROOT + '/'
IDENTITY_FIELDS = ('entityClass', 'chassis', 'model')


def _path(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError(f'Invalid source path: {value!r}')
    value = value.removeprefix(ROOT)
    if any(part in ('', '.', '..') for part in value.split('/')) or ':' in value:
        raise ValueError(f'Invalid source path: {value!r}')
    return value


def validate_source_exclusions(exclusions):
    """Validate the owner-maintained source scope without interpreting loads."""
    if not isinstance(exclusions, (list, tuple)):
        raise ValueError('Exclusions must be a list')
    for rule in exclusions:
        if not isinstance(rule, dict) or set(rule) - {'path', 'prefix', 'format', 'status', 'reason', 'entityClass'}:
            raise ValueError(f'Invalid exclusion: {rule}')
        if (rule.get('status') not in ('excluded', 'pending') or not rule.get('reason') or
                not any(rule.get(k) for k in ('path', 'prefix', 'format'))):
            raise ValueError(f'Invalid exclusion: {rule}')
        if rule.get('path'):
            _path(rule['path'])
        if rule.get('prefix'):
            if not rule['prefix'].endswith('/') or rule['prefix'].startswith(ROOT):
                raise ValueError('Exclusion prefix must be source-relative and end in /')
            _path(rule['prefix'].removesuffix('/'))


def find_source_exclusion(path, exclusions):
    """Return the unique (index, rule) from an already validated scope table."""
    path = _path(path)
    matches = [(i, r) for i, r in enumerate(exclusions)
               if ('path' not in r or path == _path(r['path']))
               and ('prefix' not in r or path.startswith(r['prefix']))
               and ('format' not in r or path.rsplit('.', 1)[-1].lower() == r['format'])]
    if len(matches) > 1:
        raise ValueError(f'Overlapping exclusions: {path}')
    return matches[0] if matches else None


def reconcile_inventory(inventory, loads, exclusions=()):
    """Count exact [class, chassis, model] identities, preserving all source rows.

    Exclusions waive absent loads only, never hash mismatches or malformed loads.
    Pending records preserve unresolved owner scope separately from exclusions.
    Family means source folder; concrete Java classes are counted independently.
    """
    sources = {_path(e['path']): e for e in inventory['entries'] if e['kind'] == 'source'}
    if len(sources) != sum(e['kind'] == 'source' for e in inventory['entries']):
        raise ValueError('Duplicate inventory path')
    indexed, used = {}, set()
    for row in loads:
        if not isinstance(row, dict):
            raise ValueError('Load rows must be objects')
        path = _path(row['path'])
        if path in indexed:
            raise ValueError(f'Duplicate load row: {path}')
        if not isinstance(row.get('sha256'), str) or not re.fullmatch('[0-9a-f]{64}', row['sha256']):
            raise ValueError(f'Invalid load hash: {path}')
        if row.get('status') not in ('loaded', 'failed'):
            raise ValueError(f'Invalid load status: {path}')
        if row['status'] == 'loaded' and (not row.get('entityClass') or
                any(not isinstance(row.get(k), str) for k in IDENTITY_FIELDS)):
            raise ValueError(f'Missing loaded identity: {path}')
        if row['status'] == 'failed' and not row.get('failure'):
            raise ValueError(f'Missing failure reason: {path}')
        indexed[path] = row
    validate_source_exclusions(exclusions)

    def exclusion(path):
        match = find_source_exclusion(path, exclusions)
        if match is None:
            return None
        i, rule = match
        used.add(i)
        return rule

    rows = []
    for path in sorted(sources.keys() | indexed.keys()):
        entry, load, rule = sources.get(path), indexed.get(path), exclusion(path)
        if entry is None and rule is None:
            raise ValueError(f'Extra load row: {path}')
        if load is None and rule is None:
            raise ValueError(f'Missing load row: {path}')
        if entry and load and entry['sha256'] != load['sha256']:
            raise ValueError(f'Hash mismatch: {path}')
        record = {'path': ROOT + path, 'sha256': (entry or load)['sha256'],
                  'family': path.split('/')[0], 'archiveMember': '!/' in path,
                  'inventoryPresent': entry is not None,
                  'entityClass': (load or {}).get('entityClass') or (rule or {}).get('entityClass', 'unknown'),
                  'status': rule['status'] if rule else load['status']}
        if rule:
            record['reason'] = rule['reason']
            if rule['status'] == 'pending':
                record['family'] = 'battlefield-support-pending'
        if load:
            record['loadStatus'] = load['status']
            if load['status'] == 'loaded':
                record['designIdentity'] = [load[k] for k in IDENTITY_FIELDS]
            elif not rule:
                record['reason'] = load['failure']
            if load['status'] == 'failed':
                record['loadFailure'] = load['failure']
            for key in ('stageFailure', 'failedEquipment'):
                if key in load:
                    record[key] = load[key]
        rows.append(record)
    if used != set(range(len(exclusions))):
        raise ValueError('Unused exclusion rule')

    def counts(group):
        counts = Counter(r['status'] for r in group)
        return {**{s: counts[s] for s in ('loaded', 'failed', 'excluded', 'pending')},
                'sourceEntries': sum(r['inventoryPresent'] for r in group),
                'archiveMembers': sum(r['archiveMember'] for r in group),
                'uniqueDesigns': len({tuple(r['designIdentity']) for r in group if r['status'] == 'loaded'})}

    def grouped(key):
        groups = defaultdict(list)
        for row in rows:
            groups[row[key]].append(row)
        return {name: counts(group) for name, group in sorted(groups.items())}

    identities = defaultdict(list)
    for row in rows:
        if row['status'] == 'loaded':
            identities[tuple(row['designIdentity'])].append(row['path'])
    return {'totals': counts(rows), 'byFamily': grouped('family'), 'byClass': grouped('entityClass'),
            'exclusions': list(exclusions), 'rows': rows,
            'duplicateDesigns': [{'designIdentity': list(key), 'sourceRows': paths}
                                 for key, paths in sorted(identities.items()) if len(paths) > 1]}
