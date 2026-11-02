"""Run the pinned-MegaMek reference exporter over all in-scope MTF/BLK sources (UL-16b).

Output goes outside the repo. Queue every Java step, e.g. heavy-run.mjs --class build -- python -B this.py ...
  python -B java_reference_exporter.py --mekfiles <mm-data>/data/mekfiles --out-dir <dir> [--selfcheck-only] [--fixture <file>]
"""
import argparse
import collections
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from java_bv_terms import reconstruction_errors, write_probes

HERE = Path(__file__).resolve().parent
RUNTIME_REFERENCE = Path('E:/Projects/Personal/MekStation-wt/_reports/2026-10-28/upstream-crosscheck/implementation/runtime-reference')
FAMILY_DIRS = ('vehicles', 'fighters', 'convfighter', 'smallcraft', 'dropships', 'jumpships', 'warship', 'spacestation',
               'meks', 'battlearmor', 'infantry', 'protomeks')
SOURCE_EXTENSIONS = dict.fromkeys(FAMILY_DIRS, '.blk') | {'meks': '.mtf'}
PINS = {'megamek': '48fcb2f64a1b3f2d575707ce5653dad64927b587', 'mmData': '50f7efef0c9f775b0258f8283525ed4f906e1985'}

# Paths relative to data/mekfiles -> (concrete class, BV, source sha256). The first eight are the plan's known
# references, followed by four capital ships and 12 UL-16b references captured from pinned Java.
KNOWN_REFERENCES = {
    'vehicles/3075/Tamerlane Strike Sled (Flamer).blk': ('Tank', 436, '5ceb9843137d2eadd33866de3484c8f9f9f4570da60e134a2a088c8d4b7f83d3'),
    'vehicles/AToW Companion/Hover/Boreas Cavalry Hovercraft Prime.blk': ('SupportTank', 78, '9c7a6cce4ed989563faadd8ce15febbaf7c9d15e30f9e14fec6556f8b8f47d33'),
    'vehicles/3039u/Ferret Light Scout VTOL.blk': ('VTOL', 58, 'a5d156aca89df05ada21a87392e87a6e0615802644d7b373272a48f7984e01ee'),
    'vehicles/3025 IS Land/Air Car.blk': ('SupportTank', 75, '78d7878ea0bc0ed301e6506c057c5944d269cbfa1ddde59c0fc81d06653b1bea'),
    'fighters/Golden Century/Sabre SB-27b-EC.blk': ('AeroSpaceFighter', 987, '8ff41dfab47cd35fa670f5d4e260bcba81e4d0ba34ee82b413bd84f3324e2f6e'),
    'vehicles/XTRs/Primitives II/Mosquito Light Fighter.blk': ('FixedWingSupport', 111, '5230da1ee307839748f07f2621056378ac5a5599cd71c98c1573865b1f8f208c'),
    'smallcraft/HBHK/Dragonstar Assault Transport (3060).blk': ('SmallCraft', 1175, '56a4a02297d3275e7a820634d64f320d1eade089a88d3f35f5bfe95ee1118a90'),
    'convfighter/3039u/Boeing Jump Bomber.blk': ('ConvFighter', 64, '9b7a098389b7da73c5c9151de8ec4de330debd9ddf6a103c119ae6c35f4823a6'),
    'dropships/TRO3057R/IS/Union (2708).blk': ('Dropship', 3972, '4f0f0208ab3353ec2ab00ac822d6831056c86fa9749b9b666ee26203bc93ac81'),
    'jumpships/3057R/Clan/Comitatus JumpShip (2995).blk': ('Jumpship', 5919, '31130a53ba44e855e55726732bd2cdf9d90a7fefa992c25f4d2d0ded437d9597'),
    'spacestation/HB HL/Crucible Station.blk': ('SpaceStation', 2004, '4bc6f8884bdcf149eb6998a27afc3b277ce62da6fced54e16fc3270a8ae11b09'),
    'warship/3057/Clan/Aegis Heavy Cruiser (2843).blk': ('Warship', 187814, '4aa9c3916a2df9ad7025d1b5fd16e580e578f241cbed55e793f337966f0d2a25'),
    'meks/3039u/Atlas AS7-D.mtf': ('BipedMek', 1897, 'afed270108038d93c33b2537ac1efc6c95c532ab6012eab25e6c3a266c1474cb'),
    'meks/3039u/Scorpion SCP-1N.mtf': ('QuadMek', 1019, '53780b2d4fa31e7f44c23be6476e2d92823f234d6afc68ef7d4600e10314988c'),
    'meks/3145/Republic/Ares ARS-V1 Zeus.mtf': ('TripodMek', 3247, '9efe9ccd8726c04344ed162badbe7d9fb4e53c1d5e8237aec0c38af66db5a0c3'),
    'battlearmor/3058Uu/Achileus BA (Sqd 4) [David].blk': ('BattleArmor', 189, '15c04915ccd68cf444a4b01a9b46b3889be1743a64aacd8226ade7d91b09c85f'),
    'battlearmor/3145/Clans/Black Wolf BA (ER Pulse) (Sqd4).blk': ('BattleArmor', 348, 'bdfb38dbfe6133d1eed740c9264805a102c09933a8051fa9634e37a3f321b716'),
    'battlearmor/XTRs/Steiner/Gray Death SA Prototype (Sqd6).blk': ('BattleArmor', 569, '7b80e77953a3f479517402090eef49b43373e3cdde830e05666959a6829903fd'),
    'infantry/3085/Clan/Clan Anti-Infantry Clan Jade Falcon Police.blk': ('ConvInfantry', 70, 'abf0436a98f9e81a2f9db2004bfcc4cfbe0a4b6f447b5ab1fd76ca19831573f5'),
    'infantry/Clan/Clan Mechanized Hover Point (Laser Basic).blk': ('ConvInfantry', 65, 'cef67d6421841bcba57d4ee056a0537e16fd076505d3a054c8b99798deb62233'),
    'infantry/Taurian Infantry/Motorized Platoon TC 3047+ (SRM).blk': ('ConvInfantry', 117, 'ef785f60125914798c4e737a129aa5cc64c4bf76d1dd5cb1ff96acbebb09d244'),
    'protomeks/3060/Centaur 2.blk': ('ProtoMek', 154, '2084acd9f401295367487f2b3c55521ac793081132beb833fc4ad28ca0acc1f1'),
    'protomeks/3075/Delphyne 3.blk': ('ProtoMek', 400, '039dcf6184b0fe0333d07d471f3b7821820fb516cfc0dae02400ecbeb4c94f8b'),
    'protomeks/XTR Clans/Minotaur-XP.blk': ('ProtoMek', 276, '25e1229a9802ea0e551044e7b6b233a2acb89212575ac0f6b34725e9390e3f6c'),
}
# Extra fixture units per concrete class on top of the references (lowest source sha256 first, so the pick is stable).
FIXTURE_EXTRAS = {
    'Tank': 4, 'SuperHeavyTank': 2, 'SupportTank': 2, 'SupportVTOL': 2, 'VTOL': 2, 'LargeSupportTank': 3,
    'AeroSpaceFighter': 3, 'ConvFighter': 1, 'FixedWingSupport': 1, 'SmallCraft': 2, 'Dropship': 2,
    'Jumpship': 1, 'Warship': 1, 'SpaceStation': 1,
}


def list_sources(mekfiles):
    root = Path(mekfiles)
    return sorted(p.relative_to(root).as_posix() for d, extension in SOURCE_EXTENSIONS.items()
                  for p in (root / d).rglob('*' + extension))


def selfcheck(rows):
    """Mismatch messages for the known references; empty means the exporter reproduces them."""
    by_path = {row['path']: row for row in rows}
    problems = []
    for path, (family, bv, sha) in KNOWN_REFERENCES.items():
        row = by_path.get(path)
        if row is None:
            problems.append(f'{path}: missing')
        elif row.get('status') != 'loaded' or 'stageFailure' in row:
            problems.append(f'{path}: {row.get("failure") or row.get("stageFailure")}')
        elif (row['concreteFamily'], row['battleValue']['total'], row['sha256']) != (family, bv, sha):
            problems.append(f'{path}: got {row["concreteFamily"]} {row["battleValue"]["total"]} {row["sha256"]}')
    return problems


def load_manifest_rows():
    return json.loads((RUNTIME_REFERENCE / 'corpus/manifest.json').read_text(encoding='utf-8'))['rows']


def source_drift(rows, manifest_rows):
    """Paths whose source sha256 differs from the pinned corpus manifest (a missing entry counts as drift)."""
    pinned = {entry['path']: entry['sha256'] for entry in manifest_rows}
    return [r['path'] for r in rows if pinned.get('data/mekfiles/' + r['path']) != r.get('sha256')]


def pinned_sources(manifest_rows):
    """In-scope source paths using the same directory/format contract as discovery."""
    prefix = 'data/mekfiles/'
    paths = (entry['path'][len(prefix):] for entry in manifest_rows if entry['path'].startswith(prefix))
    return sorted(path for path in paths if Path(path).suffix == SOURCE_EXTENSIONS.get(path.split('/')[0]))


def missing_sources(sources, manifest_rows):
    """Pinned family sources that the snapshot walk did not find."""
    return sorted(set(pinned_sources(manifest_rows)) - set(sources))


def pick_fixture(rows):
    ordered = sorted((r for r in rows if r['status'] == 'loaded'), key=lambda r: r['sha256'])
    chosen = {r['path'] for r in ordered if r['path'] in KNOWN_REFERENCES}
    for family, extra in FIXTURE_EXTRAS.items():
        chosen.update([r['path'] for r in ordered if r['concreteFamily'] == family and r['path'] not in chosen][:extra])
    return sorted((r for r in rows if r['path'] in chosen), key=lambda r: r['path'])


def digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def verify_runtime():
    """Same guard as corpus/run-corpus.py: the resolved jars and compiled classes are the recorded pinned ones."""
    for dep in json.loads((RUNTIME_REFERENCE / 'pinned-results/runtime-dependencies.json').read_text()):
        if digest(dep['file']) != dep['sha256']:
            raise ValueError('Runtime jar changed: ' + dep['file'])
    for entry in json.loads((RUNTIME_REFERENCE / 'pinned-results/compiled-runtime-files.json').read_text()):
        if digest(Path(entry['root']) / entry['path']) != entry['sha256']:
            raise ValueError('Runtime class changed: ' + entry['path'])


def run_java(mekfiles, paths, out_dir, name, per_term=False):
    mekfiles, out_dir = Path(mekfiles).resolve(), out_dir.resolve()
    jdk = Path(json.loads((RUNTIME_REFERENCE / 'build-inputs/toolchain-downloads.json').read_text())[0]['extractedRoot'])
    cp = (RUNTIME_REFERENCE / 'build-inputs/runtime-classpath.txt').read_text().strip()
    classes = out_dir / 'classes'
    classes.mkdir(exist_ok=True)
    probes = write_probes(out_dir) if per_term else []
    subprocess.run([jdk / 'bin/javac.exe', '--release', '21', '-cp', cp, '-d', classes, HERE / 'java-reference/VehicleAeroReferenceExporter.java', *probes], check=True)
    listing, rows_path = out_dir / (name + '.list.txt'), out_dir / (name + '.jsonl')
    listing.write_text('\n'.join(paths) + '\n', encoding='utf-8')
    with (out_dir / (name + '.stdout.log')).open('wb') as stdout, (out_dir / (name + '.stderr.log')).open('wb') as stderr:
        subprocess.run([jdk / 'bin/java.exe', '-Xmx2g', '-Djava.awt.headless=true', f'-Dbv.terms={str(per_term).lower()}', '-cp', f'{classes};{cp}', 'VehicleAeroReferenceExporter',
                        mekfiles, listing, rows_path], stdout=stdout, stderr=stderr, check=True,
                       cwd=RUNTIME_REFERENCE / 'build-inputs/megamek/megamek')
    return [json.loads(line) for line in rows_path.read_text(encoding='utf-8').splitlines()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mekfiles', required=True, help='pinned mm-data data/mekfiles directory (read-only)')
    parser.add_argument('--out-dir', required=True, help='scratch output directory, outside the repo')
    parser.add_argument('--selfcheck-only', action='store_true')
    parser.add_argument('--per-term', action='store_true', help='include audited subclass stage probes (bounded family scope)')
    parser.add_argument('--fixture', help='write the combined reference/extra fixture here')
    args = parser.parse_args()
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    verify_runtime()
    checked = run_java(args.mekfiles, list(KNOWN_REFERENCES), out_dir, 'selfcheck', args.per_term)
    problems = selfcheck(checked)
    if args.per_term:
        problems += [str(error) for error in reconstruction_errors(checked)]
    (out_dir / 'selfcheck.json').write_text(json.dumps({'pass': not problems, 'problems': problems}, indent=2) + '\n')
    if problems:
        sys.exit('Self-check failed, full run not attempted:\n' + '\n'.join(problems))
    print('SELFCHECK PASS', len(KNOWN_REFERENCES), flush=True)
    if args.selfcheck_only:
        return
    sources = list_sources(args.mekfiles)
    rows = run_java(args.mekfiles, sources, out_dir, 'full', args.per_term)
    failures = [r for r in rows if r['status'] != 'loaded']
    manifest = load_manifest_rows()
    drift, missing = source_drift(rows, manifest), missing_sources(sources, manifest)
    counts = [collections.Counter(path.split('/')[0] for path in paths)
              for paths in (pinned_sources(manifest), sources, [row['path'] for row in rows])]
    summary = {'pins': PINS, 'sources': len(sources), 'rows': len(rows), 'loadFailures': len(failures),
               'stageFailures': sum('stageFailure' in r for r in rows), 'pathsReconciled': [r['path'] for r in rows] == sources,
               'sourceDrift': len(drift), 'missingSources': len(missing),
               'byClass': dict(sorted(collections.Counter(r.get('concreteFamily', 'failed') for r in rows).items())),
               'byDirectory': {directory: dict(zip(('pinnedSources', 'sources', 'rows'),
                                                 (count[directory] for count in counts))) for directory in sorted(FAMILY_DIRS)}}
    (out_dir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (out_dir / 'failures.json').write_text(json.dumps([{'path': r['path'], 'failure': r.get('failure') or r.get('stageFailure')}
                                                    for r in rows if r['status'] != 'loaded' or 'stageFailure' in r], indent=2) + '\n')
    if args.per_term:
        exceptions = reconstruction_errors(rows)
        unsupported = [r['path'] for r in rows if r.get('battleValue', {}).get('termsUnsupported')]
        (out_dir / 'reconstruction.json').write_text(json.dumps({'exceptions': exceptions, 'unsupported': unsupported,
            'byFamily': dict(sorted(collections.Counter(r['concreteFamily'] for r in rows if 'terms' in r.get('battleValue', {})).items()))}, indent=2) + '\n')
        if exceptions:
            sys.exit(f'Per-term reconstruction failed: {len(exceptions)} (see reconstruction.json)')
    if drift or missing or not summary['pathsReconciled']:
        sys.exit(f'Corpus run does not match the pinned sources ({len(drift)} drifted, {len(missing)} missing, '
                 f'paths reconciled: {summary["pathsReconciled"]}):\n' + '\n'.join((drift + missing)[:20]))
    hashes = {n: digest(out_dir / n) for n in ('full.jsonl', 'full.list.txt', 'selfcheck.jsonl', 'selfcheck.json', 'summary.json', 'failures.json', 'classes/VehicleAeroReferenceExporter.class')}
    hashes['VehicleAeroReferenceExporter.java'] = digest(HERE / 'java-reference/VehicleAeroReferenceExporter.java')
    hashes['java_reference_exporter.py'] = digest(Path(__file__))
    for name in ('runtime-dependencies.json', 'compiled-runtime-files.json'):
        hashes[name] = digest(RUNTIME_REFERENCE / 'pinned-results' / name)
    if args.per_term:
        for path in [*out_dir.glob('Trace*.java'), *out_dir.rglob('Trace*.class'), HERE / 'java_bv_terms.py', HERE / 'java-reference/bv-stages.json', out_dir / 'reconstruction.json']:
            hashes[path.name] = digest(path)
    (out_dir / 'artifact-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n')
    if args.fixture:
        Path(args.fixture).write_text(json.dumps({'pins': PINS, 'mode': 'ignoreC3=true,ignoreSkill=true,ignoreTAG=true', 'rows': pick_fixture(rows)}, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == '__main__':
    main()
