"""Converter receipts: working-tree dependencies and exact serialized payload bytes."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def source_folders(scope: str = 'full') -> list[str]:
    families = json.loads((Path(__file__).parent / 'strict-families.json').read_text(encoding='utf-8'))
    if scope == 'full':
        return [folder for folders in families.values() for folder in folders]
    return families[scope]


def converter_inputs(root: Path = ROOT) -> dict[str, str]:
    spec = json.loads((root / 'scripts/megameklab-conversion/strict-provenance-inputs.json').read_text(encoding='utf-8'))
    files = [p for p in (root / spec['directory']).rglob('*') if p.is_file() and p.suffix in spec['extensions']]
    files += [root / name for name in spec['files']]
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes().replace(b'\r\n', b'\n')).hexdigest()
            for p in sorted(files)}


def write_source_manifest(out_dir: Path, folders: list[str], family: str | None = None,
                          payload: bytes | None = None) -> None:
    """Called only by the strict producer after completing its output; no signing CLI."""
    if folders != source_folders(family or 'full'):
        raise ValueError('Conversion folders differ from the declared scope')
    source = out_dir / 'sources.ndjson'
    if payload is None:
        payload = source.read_bytes()
    manifest = {'version': 1, 'scope': family or 'full', 'folders': folders,
                'sourceCount': len(payload.splitlines()),
                'sourcesSha256': hashlib.sha256(payload).hexdigest(),
                'converterInputs': converter_inputs()}
    (out_dir / 'sources.ndjson.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
