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
    '<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n<armor>\n10\n10\n10\n10\n</armor>\n'
)
# The vehicle converter hands a FixedWingSupport under vehicles/ to another converter (9 pinned
# sources): the exporter must list it as skipped, not drop it silently.
VEHICLE_FOLDER_FWS = TANK.replace('Tank</UnitType>', 'FixedWingSupport</UnitType>', 1)


class ExportVehicleAeroJsonTest(unittest.TestCase):
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
