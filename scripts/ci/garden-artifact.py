"""Read one bounded JSON member without extracting any archive paths."""

import io
import json
import re
import sys
import zipfile

MAX_BYTES = 8 * 1024 * 1024


def decode(archive, expected):
    if len(archive) > MAX_BYTES:
        raise ValueError('Observation archive exceeds eight MiB')
    if not re.fullmatch(r'ci-observation-[1-9][0-9]*-[1-9][0-9]*\.json', expected):
        raise ValueError('Unexpected observation filename')
    with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
        entries = zipped.infolist()
        if len(entries) != 1 or entries[0].filename != expected:
            raise ValueError('Observation archive must contain exactly the expected JSON member')
        entry = entries[0]
        mode = (entry.external_attr >> 16) & 0o170000
        if entry.is_dir() or mode not in (0, 0o100000) or entry.flag_bits & 1:
            raise ValueError('Observation member is not an ordinary unencrypted file')
        if entry.file_size <= 0 or entry.file_size > MAX_BYTES:
            raise ValueError('Observation JSON exceeds size bounds')
        return json.loads(zipped.read(entry).decode('utf-8'))


if __name__ == '__main__':
    try:
        print(json.dumps(decode(sys.stdin.buffer.read(MAX_BYTES + 1), sys.argv[1]), allow_nan=False))
    except (ValueError, UnicodeError, zipfile.BadZipFile, KeyError, IndexError) as error:
        sys.exit(f'Observation rejected: {error}')
