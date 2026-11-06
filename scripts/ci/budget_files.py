"""Packaged public byte identity shared by web and installer measurements."""
import hashlib
import os
from pathlib import Path


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def link_metadata(item, artifact_root):
    """Read link metadata; resolve only to enforce the artifact boundary."""
    target = os.readlink(item)
    candidate = Path(target)
    if not candidate.is_absolute():
        candidate = item.parent / candidate
    boundary = artifact_root.resolve()
    try:
        resolved = candidate.resolve(strict=False)
    except (OSError, RuntimeError) as error:
        raise ValueError(f'Unresolvable artifact link: {item}; target={target!r}; artifactRoot={boundary}: {error}') from error
    if not resolved.is_relative_to(boundary):
        raise ValueError(f'Escaping artifact link: {item}; target={target!r}; resolved={resolved}; artifactRoot={boundary}')
    return {'target': target,
            'targetStatus': 'present' if resolved.exists() else 'dangling-in-root'}


def summarize_links(entries):
    links = [entry for entry in entries if entry.get('kind') == 'symlink']
    dangling = [entry['path'] for entry in links if entry['targetStatus'] == 'dangling-in-root']
    # Reaching a complete census means every link passed the escape boundary.
    return {'count': len(links), 'paths': sorted(entry['path'] for entry in links),
            'danglingCount': len(dangling), 'danglingPaths': sorted(dangling),
            'escapingCount': 0}


def verify_public(source, packaged):
    count = 0
    for original in source.rglob('*'):
        if original.is_symlink():
            raise ValueError(f'Linked public input: {original}')
        if original.is_file():
            target = packaged / original.relative_to(source)
            if not target.is_file() or digest(original) != digest(target):
                raise ValueError(f'Packaged public byte mismatch: {original}')
            count += 1
    if not count:
        raise ValueError('Public inventory missing')
    return count
