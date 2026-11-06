"""Generate full pinned-source expectations without reading an oracle/comparator.

@spec mtf-parity-validation: Reproducible loaded-entity references
The generated proposal requires Root approval; generation does not approve it.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

from java_reference_exporter import SOURCE_EXTENSIONS
from reference_policy_sources import option_profiles, tech_level, tech_tables
from reference_policy_units import PinnedTree, VerifierDispatch
from source_inventory import build_inventory

REPO = Path(__file__).resolve().parents[2]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def goal_pins(design):
    pattern = r'MegaMek `([a-f0-9]{40})`, MegaMekLab\s+`([a-f0-9]{40})`, MekHQ\s+`([a-f0-9]{40})` and mm-data\s+`([a-f0-9]{40})`'
    match = re.search(pattern, design)
    if not match:
        raise ValueError('Independent goal pins are undocumented')
    return dict(zip(('megamek', 'megameklab', 'mekhq', 'mm-data'), match.groups()))


def invocation_settings(readme, exporter):
    """Declarations cite invocation documentation; they are not crew instrumentation."""
    crew = re.search(r'its (default loaded crew/state) and no attached game', readme)
    mutations = re.search(r'There is no (campaign damage), (custom game-option injection) or (editor-state mutation)', readme)
    mode = re.search(r'Map.of\("mode", "([^"]+)"', exporter)
    if not crew or not mutations or not mode:
        raise ValueError('Independent invocation settings are undocumented')
    overrides = {key: value == 'true' for key, value in (part.split('=') for part in mode[1].split(','))}
    overrides.update({name: False for name in mutations.groups()})
    return {'crew': {'state': crew[1]}, 'network': {'attachedGame': False}, 'bvOverrides': overrides,
            'battleValueMode': mode[1]}


def generate(runtime_root, config_receipt):
    runtime_root = Path(runtime_root)
    design = (REPO / 'openspec/changes/establish-all-unit-data-parity/design.md').read_text(encoding='utf-8')
    pins = goal_pins(design)
    checkouts = json.loads((runtime_root / 'build-inputs/checkout-manifest.json').read_text())
    repos = {entry['repository']: entry for entry in checkouts}
    for name in ('megamek', 'megameklab', 'mm-data'):
        if repos[name]['pin'] != pins[name] or repos[name]['actualHead'] != pins[name]:
            raise ValueError('Runtime build inputs differ from goal pin: ' + name)
    native = PinnedTree(repos['megamek']['path'], pins['megamek'])
    data = PinnedTree(repos['mm-data']['path'], pins['mm-data'])
    inventory = build_inventory(data.repo, data.pin, repository='https://github.com/MegaMek/mm-data')
    source_records = {entry['path'].removeprefix('data/mekfiles/'): entry for entry in inventory['entries']}
    dispatch = VerifierDispatch(native)
    sources = {key: native.source(Path(key).stem) for key in (
        'verifier/TestEntityOption.java', 'verifier/TestXMLOption.java', 'loaders/MtfFile.java',
        'loaders/BLKFile.java', 'TechConstants.java', 'verifier/Ceil.java')}
    receipt_bytes = Path(config_receipt).read_bytes()
    receipt = json.loads(receipt_bytes)
    xml_bytes = Path(receipt['path']).read_bytes()
    pinned_xml = data.read('data/mekfiles/UnitVerifierOptions.xml').encode('utf-8')
    if digest(xml_bytes) != receipt['sha256'] or xml_bytes.replace(b'\r\n', b'\n') != pinned_xml:
        raise ValueError('Consumed XML does not match recorded bytes and pinned text')
    profiles, profile_citations = option_profiles(sources, xml_bytes.decode('utf-8'))
    tables = tech_tables(sources)
    exporter_path = REPO / 'scripts/megameklab-conversion/java-reference/VehicleAeroReferenceExporter.java'
    exporter_bytes = exporter_path.read_bytes()
    settings = invocation_settings((runtime_root / 'README.md').read_text(encoding='utf-8'), exporter_bytes.decode('utf-8'))
    toolchains = json.loads((runtime_root / 'build-inputs/toolchain-downloads.json').read_text())
    jdk = Path(toolchains[0]['extractedRoot'])
    version = subprocess.check_output([str(jdk / 'bin/java.exe'), '--version']).decode().replace('\r\n', '\n').strip()
    policy = {'version': 1, 'runtime': {
        'megamekCommit': pins['megamek'], 'megameklabCommit': pins['megameklab'], 'mmDataCommit': pins['mm-data'],
        'javaVersion': version,
        'dependencyManifestSha256': digest((runtime_root / 'pinned-results/runtime-dependencies.json').read_bytes()),
        'compiledRuntimeManifestSha256': digest((runtime_root / 'pinned-results/compiled-runtime-files.json').read_bytes()),
        'exporterSha256': digest(exporter_bytes), 'verifierConfigSha256': receipt['sha256'],
    }, **settings, 'verifierSettings': {}}
    runtime_sources = {
        'pythonExporterSha256': REPO / 'scripts/megameklab-conversion/java_reference_exporter.py',
        'constructionSourceSha256': exporter_path.with_name('ConstructionReference.java'),
        'constructionTermsSha256': REPO / 'scripts/megameklab-conversion/java_construction_terms.py',
        'bvGeneratorSha256': REPO / 'scripts/megameklab-conversion/java_bv_terms.py',
        'bvStagesSha256': exporter_path.with_name('bv-stages.json'),
        'runtimeClasspathSha256': runtime_root / 'build-inputs/runtime-classpath.txt',
        'toolchainManifestSha256': runtime_root / 'build-inputs/toolchain-downloads.json',
        'javaExecutableSha256': jdk / 'bin/java.exe',
    }
    policy['runtime'].update({key: digest(path.read_bytes()) for key, path in runtime_sources.items()})
    units, unspecified = {}, []
    for path, content in sorted(data.unit_blobs()):
        if Path(path).suffix != SOURCE_EXTENSIONS.get(path.split('/')[0]):
            continue
        origin = source_records[path]
        if digest(content) != origin['sha256']:
            raise ValueError('Archive bytes differ from immutable inventory blob: ' + path)
        text = content.decode('utf-8-sig')
        profile = dispatch.profile(path, text)
        expected = dict(profiles.get(profile, {}))
        expected.update(gameYear=dispatch.game_year, ammoTechLevel=tech_level(path, text, tables))
        if profile is None:
            unspecified.append({'path': path, 'setting': 'profile', 'reason': 'Unrecognized native verifier dispatch'})
        for key, value in expected.items():
            if value is None:
                unspecified.append({'path': path, 'setting': key, 'reason': 'No independently recognized source rule'})
        policy['verifierSettings'][path] = expected
        units[path] = {'sha256': origin['sha256'], 'blob': origin['blob'], 'profile': profile,
                       'technologySource': 'loaders/MtfFile.java:setTechLevel' if path.endswith('.mtf') else 'loaders/BLKFile.java:setTechLevel'}
    evidence = {
        'status': 'proposal-not-approved', 'goalPins': pins, 'nonConsumedGoalContext': ['mekhq'],
        'sourceCount': len(units), 'unspecified': unspecified, 'units': units,
        'settingCitations': {**profile_citations, 'gameYear': 'verifier/TestEntity.java:private gameYear initializer',
                            'ammoTechLevel': 'source TechBase/Rules Level or type/year -> pinned loader setTechLevel -> TechConstants.java'},
        'nativeSourceSha256': native.reads, 'pinnedXmlSha256': digest(pinned_xml),
        'consumedXmlSha256': digest(xml_bytes), 'configReceiptSha256': digest(receipt_bytes),
        'invocationCitations': {'crew/network/mutations': 'runtime-reference/README.md: Executed source-load scenarios',
                               'battleValueMode': 'VehicleAeroReferenceExporter.java:battleValue'},
        'runtimeCitations': {
            **{key: str(path) for key, path in runtime_sources.items()},
            'megamekCommit': 'design.md D1; runtime-reference/build-inputs/checkout-manifest.json:megamek',
            'megameklabCommit': 'design.md D1; runtime-reference/build-inputs/checkout-manifest.json:megameklab',
            'mmDataCommit': 'design.md D1; runtime-reference/build-inputs/checkout-manifest.json:mm-data',
            'javaVersion': 'toolchain-downloads.json[0].extractedRoot/bin/java.exe --version; LF/outer-trim capture',
            'dependencyManifestSha256': 'runtime-reference/pinned-results/runtime-dependencies.json exact bytes',
            'compiledRuntimeManifestSha256': 'runtime-reference/pinned-results/compiled-runtime-files.json exact bytes',
            'exporterSha256': 'scripts/megameklab-conversion/java-reference/VehicleAeroReferenceExporter.java exact bytes',
            'verifierConfigSha256': 'independent accepted verifier-config.json receipt; exact consumed XML bytes; pinned text checked',
        },
        'generatorInputsSha256': {str(path.relative_to(REPO)): digest(path.read_bytes()) for path in (
            Path(__file__), Path(__file__).with_name('reference_policy_sources.py'),
            Path(__file__).with_name('reference_policy_units.py'), exporter_path,
            REPO / 'openspec/changes/establish-all-unit-data-parity/design.md')},
    }
    return policy, evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime-root', type=Path, required=True)
    parser.add_argument('--config-receipt', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--node', required=True, help='Node22 for owning repository oxfmt')
    args = parser.parse_args()
    policy, evidence = generate(args.runtime_root, args.config_receipt)
    args.out.mkdir(parents=True, exist_ok=True)
    paths = [args.out / 'expected-reference-policy.json', args.out / 'derivation.json']
    for path, document in zip(paths, (policy, evidence)):
        path.write_text(json.dumps(document, indent=2, ensure_ascii=False, sort_keys=True) + '\n', encoding='utf-8', newline='\n')
    subprocess.run([args.node, str(REPO / 'node_modules/oxfmt/bin/oxfmt'), '--write', *map(str, paths)], cwd=REPO, check=True)
    print(json.dumps({'sources': evidence['sourceCount'], 'unspecified': len(evidence['unspecified']),
                      'hashes': {p.name: digest(p.read_bytes()) for p in paths}}))
    return int(bool(evidence['unspecified']))


if __name__ == '__main__':
    raise SystemExit(main())
