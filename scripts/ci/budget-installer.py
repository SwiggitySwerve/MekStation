"""Verify a complete Linux tar installer against its real unpacked application."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile
from budget_files import digest, link_target, verify_public


def verify(archive, unpacked, public):
    if not unpacked.is_dir():
        raise ValueError('Unpacked application missing')
    expected = {}
    for item in unpacked.rglob('*'):
        name = item.relative_to(unpacked).as_posix()
        if item.is_symlink():
            expected[name] = ('link', link_target(item, unpacked))
        elif item.is_file():
            expected[name] = ('file', digest(item))
        elif not item.is_dir():
            raise ValueError(f'Unknown unpacked member type: {item}')
    if not expected:
        raise ValueError('Unpacked inventory missing')
    actual = {}
    with tarfile.open(archive, 'r:gz') as packed:
        members = packed.getmembers()
        anchor = 'resources/next-standalone/server.js'
        roots = [m.name[:-len(anchor)] for m in members if m.name.endswith('/' + anchor) or m.name == anchor]
        if len(roots) != 1:
            raise ValueError('Installer runtime root missing/ambiguous')
        prefix = roots[0]
        for member in members:
            if member.isdir():
                continue
            if not member.name.startswith(prefix):
                raise ValueError('Installer member outside application root')
            name = member.name[len(prefix):]
            if PurePosixPath(name).is_absolute() or '..' in PurePosixPath(name).parts or name in actual:
                raise ValueError('Unsafe/duplicate installer member')
            if member.issym():
                actual[name] = ('link', member.linkname)
            elif member.isfile() or member.islnk():
                value = packed.extractfile(member)
                if value is None:
                    raise ValueError('Installer member unreadable')
                actual[name] = ('file', hashlib.sha256(value.read()).hexdigest())
            else:
                raise ValueError('Unknown installer member type')
    if actual != expected:
        raise ValueError('Installer inventory/bytes differ from complete unpacked application')
    public_count = verify_public(public, unpacked / 'resources/next-standalone/public')
    return {'complete': True, 'members': len(actual), 'publicFiles': public_count}


if __name__ == '__main__':
    print(json.dumps(verify(*(Path(value).resolve() for value in sys.argv[1:]))))
