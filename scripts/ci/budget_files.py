"""Packaged public byte identity shared by web and installer measurements."""
import hashlib


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


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
