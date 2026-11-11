"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_export_vehicle_aero_json.py -v.

``export_vehicle_aero_json`` writes converter output as NDJSON ``{path, unit}`` rows keyed by the
mekfiles-relative source path (the join key to the UL-16 Java reference) and lists skipped sources.
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from export_vehicle_aero_json import export

REPO_ROOT = Path(__file__).resolve().parents[2]

TANK = (
    '<UnitType>Tank</UnitType>\n<Name>Export Tank</Name>\n<motion_type>Tracked</motion_type>\n'
    '<year>3060</year>\n<tonnage>20</tonnage>\n<cruiseMP>4</cruiseMP>\n<engine_type>0</engine_type>\n'
    '<armor_type>0</armor_type>\n<armor>\n10\n10\n10\n10\n</armor>\n'
)
FIGHTER = (
    '<UnitType>AeroSpaceFighter</UnitType>\n<Name>Export Fighter</Name>\n<year>3060</year>\n'
    '<heatsinks>0</heatsinks>\n'
    '<sink_type>0</sink_type>\n'
    '<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n<armor>\n10\n10\n10\n10\n</armor>\n'
)
# The vehicle converter hands a FixedWingSupport under vehicles/ to another converter (9 pinned
# sources): the exporter must list it as skipped, not drop it silently.
VEHICLE_FOLDER_FWS = TANK.replace('Tank</UnitType>', 'FixedWingSupport</UnitType>', 1)


class ExportVehicleAeroJsonTest(unittest.TestCase):
    def test_catalog_objects_use_converter_owner_and_never_publish_bv_input_receipts(self):
        from export_vehicle_aero_json import export_strict
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            mekfiles = root / 'mekfiles'
            source = mekfiles / 'battlearmor' / 'armor.blk'
            source.parent.mkdir(parents=True)
            source.write_bytes(b'fixture\r\n')
            unit = {'chassis': 'Armor', 'model': '', 'unitType': 'BattleArmor'}
            with patch('blk_battlearmor_converter.convert_battlearmor_blk', return_value=unit) as convert:
                export_strict(mekfiles, root / 'before', family='battlearmor')
                export_strict(mekfiles, root / 'objects', family='battlearmor', catalog_objects=True)
                convert.assert_called_once()
                export_strict(mekfiles, root / 'after', family='battlearmor')
            self.assertEqual((root / 'before/sources.ndjson').read_bytes(), (root / 'after/sources.ndjson').read_bytes())
            rows = [json.loads(line) for line in (root / 'objects/catalog-objects.ndjson').read_text().splitlines()]
            self.assertEqual(rows[0]['unit'], unit)
            self.assertNotIn('sourceText', rows[0])
            self.assertFalse((root / 'objects/sources.ndjson').exists())
            self.assertFalse((root / 'objects/sources.ndjson.manifest.json').exists())
            receipt = json.loads((root / 'objects/catalog-objects.ndjson.manifest.json').read_text())
            self.assertEqual(receipt['kind'], 'catalog-objects-only')
            self.assertEqual(receipt['sourceCount'], 1)

    def test_strict_sources_are_independent_hashed_and_unsupported_rows_are_retained(self):
        import hashlib
        from export_vehicle_aero_json import export_strict

        with tempfile.TemporaryDirectory() as temp:
            mekfiles, out = Path(temp) / 'mekfiles', Path(temp) / 'out'
            sources = {
                'vehicles/tank.blk': TANK,
                'vehicles/wing.blk': VEHICLE_FOLDER_FWS,
                'battlearmor/unsupported.blk': 'unsupported\r\n',
                'protomeks/source.blk': 'native\r\n',
                'ge/excluded.blk': TANK,
                'vehicles/excluded.bfs': 'excluded',
            }
            for rel, body in sources.items():
                target = mekfiles / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(body.encode('utf-8'))
            export_strict(mekfiles, out)
            rows = [json.loads(line) for line in (out / 'sources.ndjson').read_text(encoding='utf-8').splitlines()]
            by_path = {row['path']: row for row in rows}
            self.assertEqual(set(by_path), set(sources) - {'ge/excluded.blk', 'vehicles/excluded.bfs'})
            for rel, row in by_path.items():
                self.assertEqual(row['sha256'], hashlib.sha256(sources[rel].replace('\r\n', '\n').encode('utf-8')).hexdigest())
            self.assertIsNotNone(by_path['vehicles/wing.blk']['unit'])
            self.assertEqual(by_path['battlearmor/unsupported.blk']['sourceText'], 'unsupported\r\n')
            self.assertEqual(by_path['protomeks/source.blk']['sourceText'], 'native\r\n')

    def test_rows_are_keyed_by_source_path_and_skips_are_listed(self):
        with tempfile.TemporaryDirectory() as temp:
            mekfiles = Path(temp) / 'mekfiles'
            for rel, body in (
                ('vehicles/3060/Export Tank.blk', TANK),
                ('vehicles/3060/Export Wing.blk', VEHICLE_FOLDER_FWS),
                ('fighters/Export Fighter.blk', FIGHTER),
            ):
                (mekfiles / rel).parent.mkdir(parents=True, exist_ok=True)
                (mekfiles / rel).write_text(body, encoding='utf-8')
            out = Path(temp) / 'out'
            summary = export(mekfiles, out)

            vehicles = [json.loads(line) for line in (out / 'vehicles.ndjson').read_text(encoding='utf-8').splitlines()]
            aerospace = [json.loads(line) for line in (out / 'aerospace.ndjson').read_text(encoding='utf-8').splitlines()]
            self.assertEqual([row['path'] for row in vehicles], ['vehicles/3060/Export Tank.blk'])
            self.assertEqual(vehicles[0]['unit']['unitType'], 'Vehicle')
            self.assertEqual([row['path'] for row in aerospace], ['fighters/Export Fighter.blk'])
            self.assertEqual(aerospace[0]['unit']['unitType'], 'Aerospace')
            self.assertEqual(summary['vehicles']['skipped'], ['vehicles/3060/Export Wing.blk'])
            self.assertEqual(summary['aerospace']['skipped'], [])
            self.assertEqual(json.loads((out / 'export-summary.json').read_text(encoding='utf-8')), summary)


class ExportOutputGuardTest(unittest.TestCase):
    def test_protected_catalog_paths_are_refused_before_any_write(self):
        data = REPO_ROOT / 'public' / 'data'
        candidates = [
            data,
            data / 'units' / 'vehicles',
            Path(os.path.relpath(data)),
            Path(str(data).upper()) if os.name == 'nt' else data,
            data / 'units' / '..' / 'units',
        ]
        for out_dir in candidates:
            with self.subTest(out_dir=str(out_dir)), \
                    patch.object(Path, 'mkdir', side_effect=AssertionError('mkdir reached')), \
                    patch('builtins.open', side_effect=AssertionError('open reached')), \
                    self.assertRaisesRegex(ValueError, 'public/data'):
                export(Path('unused-mekfiles'), out_dir)

    @unittest.skipUnless(os.name == 'nt', 'drive letters are Windows-only')
    def test_scratch_on_another_drive_is_accepted(self):
        from export_vehicle_aero_json import _require_scratch

        repo_drive = os.path.splitdrive(str(REPO_ROOT))[0].upper()
        other = next(d for d in ('E:', 'D:', 'Z:') if d != repo_drive)
        _require_scratch(Path(other + '/scratch/ul17-export'))  # must not raise

    @unittest.skipUnless(os.name == 'nt', 'Windows namespace prefixes and junctions')
    def test_windows_aliases_of_the_data_tree_are_refused(self):
        # Path.resolve() keeps an explicit \\?\ prefix, and a junction is a second name
        # for the same directory; identity, not spelling, must decide (#2443 r5).
        import subprocess
        data = REPO_ROOT / 'public' / 'data'
        with tempfile.TemporaryDirectory() as temp:
            junction = Path(temp) / 'data-alias'
            subprocess.run(['cmd', '/c', 'mklink', '/J', str(junction), str(data)],
                           check=True, capture_output=True)
            try:
                for out_dir in (Path('\\\\?\\' + str(data)), Path('\\\\?\\' + str(data / 'units' / 'x')),
                                junction, junction / 'units', Path('\\\\?\\' + str(junction))):
                    with self.subTest(out_dir=str(out_dir)), \
                            patch.object(Path, 'mkdir', side_effect=AssertionError('mkdir reached')), \
                            patch('builtins.open', side_effect=AssertionError('open reached')), \
                            self.assertRaisesRegex(ValueError, 'public/data'):
                        export(Path('unused-mekfiles'), out_dir)
            finally:
                subprocess.run(['cmd', '/c', 'rmdir', str(junction)], check=True, capture_output=True)

if __name__ == '__main__':
    unittest.main()
