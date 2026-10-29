"""Project immutable Git inventory into the standalone source-origin contract.

@spec unit-services: Immutable inventory provenance producer
No entity parsing, catalog writes or numerical-parity claims.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from schema_gate import validate_source_provenance
from source_inventory import InventoryError, build_inventory


def build_source_provenance(repo: Path, commit: str, *, repository: str) -> dict:
    """Preserve every source row; reject coverage the contract cannot represent."""
    inventory = build_inventory(repo, commit, repository=repository)
    archives = [row['path'] for row in inventory['entries'] if row['kind'] == 'archive']
    if archives:
        raise InventoryError('Unsupported archive coverage: ' + ', '.join(archives))
    document = {
        'format': 'battletech-source-provenance',
        'version': '1.0.0',
        'sources': [
            {
                'source': {
                    'kind': 'git', 'repository': inventory['repository'],
                    'commit': inventory['commit'], 'path': row['path'], 'blob': row['blob'],
                },
                'originalFormat': row['format'], 'sha256': row['sha256'],
            }
            for row in inventory['entries'] if row['kind'] == 'source'
        ],
    }
    if len(document['sources']) != inventory['summary']['sourceFiles']:
        raise InventoryError('Source row accounting mismatch')
    errors = validate_source_provenance(document)
    if errors:
        raise InventoryError('Source provenance schema rejection:\n' + '\n'.join(errors))
    return document


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True, type=Path, help='Local source Git repository')
    parser.add_argument('--commit', required=True, help='Full immutable commit hash')
    parser.add_argument('--repository', required=True, help='Asserted stable HTTPS repository identity')
    args = parser.parse_args()
    try:
        document = build_source_provenance(args.repo, args.commit, repository=args.repository)
    except (InventoryError, OSError) as error:
        print(f'Source provenance failed: {error}', file=sys.stderr)
        return 1
    sys.stdout.buffer.write((json.dumps(document, indent=2, ensure_ascii=False) + '\n').encode('utf-8'))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
