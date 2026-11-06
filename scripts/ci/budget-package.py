"""Complete web-build artifact census and ZIP, including hidden Next output.

The four roots are exactly the web-build upload/download contract. The static
copy inside standalone and the separate static tree are both intentional bytes.
No directory/file filtering, deduplication, or size supplied by a caller.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import zipfile
from budget_files import digest, link_target, verify_public

ROOTS = ('.next/standalone', '.next/static', 'desktop/dist', 'public/record-sheets')


def census(root):
    files = []
    for name in ROOTS:
        directory = root / name
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError(f'Missing/linked artifact root: {name}')
        start = len(files)
        # Never recurse into directory links or read a file link's referent.
        for current, directories, names in os.walk(directory, followlinks=False):
            for member in sorted(directories + names):
                item = Path(current) / member
                if item.is_symlink():
                    target = link_target(item, directory)
                    content = os.fsencode(target)
                    files.append({'path': item.relative_to(root).as_posix(),
                                  'kind': 'symlink', 'target': target,
                                  'bytes': len(content),
                                  'sha256': hashlib.sha256(content).hexdigest()})
                elif item.is_file():
                    files.append({'path': item.relative_to(root).as_posix(),
                                  'bytes': item.stat().st_size,
                                  'sha256': digest(item)})
                elif not item.is_dir():
                    raise ValueError(f'Unknown artifact member type: {item}')
        if len(files) == start:
            raise ValueError(f'Empty artifact root: {name}')
    for sentinel in ('.next/standalone/server.js', '.next/standalone/.next/BUILD_ID',
                     'desktop/dist/electron/main.js'):
        if not (root / sentinel).is_file():
            raise ValueError(f'Missing packaged runtime: {sentinel}')
    # Every public file must survive hydration with the same bytes. Incomplete
    # old artifacts that dropped hidden .next output or public assets fail.
    verify_public(root / 'public', root / '.next/standalone/public')
    return sorted(files, key=lambda entry: entry['path'])


def measure(root, archive, verify_existing=False):
    files = census(root)
    if archive.is_relative_to(root / '.next') or archive.is_relative_to(root / 'desktop/dist') or archive.is_relative_to(root / 'public'):
        raise ValueError('Archive must be outside artifact inputs')
    if not verify_existing:
        archive.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as output:
            for entry in files:
                if entry.get('kind') == 'symlink':
                    member = zipfile.ZipInfo(entry['path'])
                    member.create_system = 3
                    member.external_attr = (stat.S_IFLNK | 0o777) << 16
                    output.writestr(member, os.fsencode(entry['target']), compress_type=zipfile.ZIP_DEFLATED)
                else:
                    output.write(root / entry['path'], entry['path'])
    with zipfile.ZipFile(archive) as zipped:
        if sorted(zipped.namelist()) != [entry['path'] for entry in files]:
            raise ValueError('ZIP inventory differs from complete artifact')
        for entry in files:
            linked = stat.S_ISLNK(zipped.getinfo(entry['path']).external_attr >> 16)
            if linked != (entry.get('kind') == 'symlink'):
                raise ValueError(f'ZIP link type mismatch: {entry["path"]}')
            content = zipped.read(entry['path'])
            if len(content) != entry['bytes'] or hashlib.sha256(content).hexdigest() != entry['sha256']:
                raise ValueError(f'ZIP byte mismatch: {entry["path"]}')
    return {'unit': 'bytes', 'roots': list(ROOTS),
            'standaloneStaticBytes': sum(e['bytes'] for e in files if e['path'].startswith(('.next/standalone/', '.next/static/'))),
            'webZipBytes': archive.stat().st_size, 'files': files,
            'symlinks': {'count': sum(e.get('kind') == 'symlink' for e in files),
                         'paths': [e['path'] for e in files if e.get('kind') == 'symlink'],
                         'byteAccounting': 'encoded target path bytes; referents are not followed'},
            'archive': {'path': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--archive', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--verify-existing', action='store_true')
    args = parser.parse_args()
    report = measure(Path(args.root).resolve(), Path(args.archive).resolve(), args.verify_existing)
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('standaloneStaticBytes', 'webZipBytes')}))
