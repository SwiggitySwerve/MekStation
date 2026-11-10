"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_mtf_component_vocabulary.py -v.

mtf-component-vocabulary.json is shared with the TypeScript MTF parser. Python
keeps its legacy aliases and heuristic fallbacks, so converter output must not
move when the tables are read from the shared file.
"""

import importlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

CONVERSION = Path(__file__).resolve().parents[1] / 'megameklab-conversion'
SHARED = Path(__file__).resolve().parents[2] / 'src/types/formats/mtf-component-vocabulary.json'
sys.path.insert(0, str(CONVERSION))

import enum_mapping_tables
from enum_mappings import (
    map_cockpit_type,
    map_gyro_type,
    map_heat_sink_type,
    map_rules_level,
)

# Tables as committed before the shared file existed (origin/main 149dd1851).
OLD_GYRO = {
    "Standard Gyro": "STANDARD", "Standard": "STANDARD", "XL Gyro": "XL",
    "Extra-Light Gyro": "XL", "Compact Gyro": "COMPACT",
    "Heavy Duty Gyro": "HEAVY_DUTY", "Heavy-Duty Gyro": "HEAVY_DUTY",
    "Superheavy Gyro": "SUPERHEAVY", "Super Heavy Gyro": "SUPERHEAVY",
    "None": "NONE", "0": "STANDARD", "1": "XL", "2": "COMPACT",
    "3": "HEAVY_DUTY", "4": "SUPERHEAVY",
}
OLD_COCKPIT = {
    "Standard Cockpit": "STANDARD", "Standard": "STANDARD",
    "Small Cockpit": "SMALL", "Small": "SMALL",
    "Command Console": "COMMAND_CONSOLE",
    "Torso-Mounted Cockpit": "TORSO_MOUNTED", "Torso Cockpit": "TORSO_MOUNTED",
    "Primitive Cockpit": "PRIMITIVE", "Primitive": "PRIMITIVE",
    "Industrial Cockpit": "INDUSTRIAL", "Industrial": "INDUSTRIAL",
    "Primitive Industrial Cockpit": "PRIMITIVE_INDUSTRIAL",
    "Primitive Industrial": "PRIMITIVE_INDUSTRIAL",
    "Superheavy Industrial Cockpit": "SUPERHEAVY_INDUSTRIAL",
    "Tripod Industrial Cockpit": "TRIPOD_INDUSTRIAL",
    "Superheavy Tripod Industrial Cockpit": "SUPERHEAVY_TRIPOD_INDUSTRIAL",
    "Superheavy Cockpit": "SUPERHEAVY",
    "Superheavy Tripod Cockpit": "SUPERHEAVY_TRIPOD",
    "Interface Cockpit": "INTERFACE",
    "Virtual Reality Piloting Pod": "VRRP", "VRRP": "VRRP",
    "QuadVee Cockpit": "QUADVEE",
}
OLD_HEAT_SINK = {
    "Single": "SINGLE", "Single Heat Sink": "SINGLE", "Single Heat Sinks": "SINGLE",
    "Double": "DOUBLE", "Double Heat Sink": "DOUBLE", "Double Heat Sinks": "DOUBLE",
    "Double (IS)": "DOUBLE", "Double (Clan)": "DOUBLE_CLAN",
    "Clan Double Heat Sink": "DOUBLE_CLAN", "Clan Double": "DOUBLE_CLAN",
    "Compact": "COMPACT", "Compact Heat Sink": "COMPACT",
    "Laser": "LASER", "Laser Heat Sink": "LASER",
}
OLD_RULES = {
    "0": "INTRODUCTORY", "1": "INTRODUCTORY", "2": "STANDARD", "3": "ADVANCED",
    "4": "EXPERIMENTAL", "5": "UNOFFICIAL", "Introductory": "INTRODUCTORY",
    "Standard": "STANDARD", "Advanced": "ADVANCED",
    "Experimental": "EXPERIMENTAL", "Unofficial": "UNOFFICIAL",
    "IS Level 1": "INTRODUCTORY", "IS Level 2": "STANDARD",
    "IS Level 3": "ADVANCED", "IS Level 4": "EXPERIMENTAL",
    "Clan Level 2": "STANDARD", "Clan Level 3": "ADVANCED",
}
# Names the pinned loader accepts (Mek.java:185-229) and the writer emits
# (Mek.java:4879-4898, 5351-5362). Before the shared file the heuristic
# fallbacks resolved some of these and defaulted the rest.
NEW_EXACT = {
    'GYRO_TYPE_MAP': {"XL": "XL", "Compact": "COMPACT", "Heavy Duty": "HEAVY_DUTY",
                      "Superheavy": "SUPERHEAVY"},
    'COCKPIT_TYPE_MAP': {
        "Tripod Cockpit": "STANDARD", "Tripod": "STANDARD",
        "Torso Mounted": "TORSO_MOUNTED", "Superheavy": "SUPERHEAVY",
        "Superheavy Tripod": "SUPERHEAVY_TRIPOD", "Interface": "INTERFACE",
        "VRPP": "VRRP", "Quadvee": "QUADVEE",
        "Superheavy Industrial": "SUPERHEAVY_INDUSTRIAL",
        "Tripod Industrial": "TRIPOD_INDUSTRIAL",
        "Superheavy Tripod Industrial": "SUPERHEAVY_TRIPOD_INDUSTRIAL",
    },
    'HEAT_SINK_TYPE_MAP': {"IS Double": "DOUBLE"},
}
TABLES = (
    ('GYRO_TYPE_MAP', OLD_GYRO, 'gyro'),
    ('COCKPIT_TYPE_MAP', OLD_COCKPIT, 'cockpit'),
    ('HEAT_SINK_TYPE_MAP', OLD_HEAT_SINK, 'heatSink'),
    ('RULES_LEVEL_MAP', OLD_RULES, 'rulesLevel'),
)


class MtfComponentVocabularyTest(unittest.TestCase):
    def test_python_tables_are_the_old_tables_plus_only_the_exact_additions(self):
        for name, old, _ in TABLES:
            with self.subTest(table=name):
                expected = {**old, **NEW_EXACT.get(name, {})}
                self.assertEqual(getattr(enum_mapping_tables, name), expected)

    def test_every_shared_entry_is_present_in_the_python_table(self):
        shared = json.loads(SHARED.read_text(encoding='utf-8-sig'))
        for name, _, key in TABLES:
            for source, identity in shared[key].items():
                with self.subTest(table=name, source=source):
                    self.assertEqual(getattr(enum_mapping_tables, name)[source], identity)

    def test_shared_file_carries_the_corpus_source_strings(self):
        # Every distinct value in the 4,263 pinned MTFs (mm-data 50f7efe).
        shared = json.loads(SHARED.read_text(encoding='utf-8-sig'))
        corpus = {
            'gyro': {'Standard Gyro': 'STANDARD', 'XL Gyro': 'XL', 'Compact Gyro': 'COMPACT',
                     'Heavy Duty Gyro': 'HEAVY_DUTY', 'None': 'NONE', 'Superheavy Gyro': 'SUPERHEAVY'},
            'cockpit': {'Standard Cockpit': 'STANDARD', 'Small Cockpit': 'SMALL',
                        'Industrial Cockpit': 'INDUSTRIAL', 'Primitive Cockpit': 'PRIMITIVE',
                        'Torso-Mounted Cockpit': 'TORSO_MOUNTED', 'Command Console': 'COMMAND_CONSOLE',
                        'Interface Cockpit': 'INTERFACE', 'QuadVee Cockpit': 'QUADVEE',
                        'Superheavy Tripod Cockpit': 'SUPERHEAVY_TRIPOD', 'Tripod Cockpit': 'STANDARD',
                        'Superheavy Cockpit': 'SUPERHEAVY',
                        'Primitive Industrial Cockpit': 'PRIMITIVE_INDUSTRIAL',
                        'Virtual Reality Piloting Pod': 'VRRP'},
            'heatSink': {'IS Double': 'DOUBLE', 'Clan Double': 'DOUBLE_CLAN', 'Single': 'SINGLE',
                         'Laser': 'LASER', 'Compact': 'COMPACT'},
            'rulesLevel': {'1': 'INTRODUCTORY', '2': 'STANDARD', '3': 'ADVANCED',
                           '4': 'EXPERIMENTAL', '5': 'UNOFFICIAL'},
        }
        for key, rows in corpus.items():
            for source, identity in rows.items():
                with self.subTest(table=key, source=source):
                    self.assertEqual(shared[key][source], identity)

    def test_converter_functions_return_the_same_identities_for_listed_names(self):
        # Tripod Cockpit keeps the catalog's STANDARD until the converter and
        # CockpitType are extended together (4.1-g.2).
        for table, mapper in ((OLD_GYRO, map_gyro_type), (OLD_COCKPIT, map_cockpit_type),
                              (OLD_HEAT_SINK, map_heat_sink_type)):
            for source, identity in table.items():
                with self.subTest(mapper=mapper.__name__, source=source):
                    self.assertEqual(mapper(source), identity)
        for source, identity in {**OLD_RULES, 'Level 3': 'ADVANCED', '': 'STANDARD',
                                 '99': 'STANDARD'}.items():
            with self.subTest(rules=source):
                self.assertEqual(map_rules_level(source), identity)

    def test_blank_values_are_the_pinned_loaders_standard(self):
        # MtfFile.java:252-269: an absent or blank gyro/cockpit line is Standard.
        for value in ('', '  '):
            with self.subTest(value=value):
                self.assertEqual(map_gyro_type(value), 'STANDARD')
                self.assertEqual(map_cockpit_type(value), 'STANDARD')
                self.assertEqual(map_heat_sink_type(value), 'SINGLE')

    def test_unlisted_names_raise_instead_of_defaulting(self):
        # Same contract as map_armor_type: no substring heuristics, no Standard.
        cases = (
            (map_gyro_type, 'UNSUPPORTED_GYRO', ('Mystery Gyro', 'Super heavy gyro', 'Light XL Gyro', 'xl gyro')),
            (map_cockpit_type, 'UNSUPPORTED_COCKPIT',
             ('Dual Cockpit', 'Small Command Console', 'Superheavy Command Console', 'standard cockpit', 'Unknown')),
            (map_heat_sink_type, 'UNSUPPORTED_HEAT_SINK', ('DOUBLE clan', 'Dissipators', 'Double Clan')),
        )
        for mapper, label, names in cases:
            for name in names:
                with self.subTest(mapper=mapper.__name__, name=name):
                    with self.assertRaisesRegex(ValueError, label):
                        mapper(name)

    def test_cockpit_order_is_the_pinned_java_index_order(self):
        # Mek.java:214-229. The TypeScript importer scans this order for the
        # first prefix match (Mek.getCockpitTypeForString), so it must not drift.
        shared = json.loads(SHARED.read_text(encoding='utf-8-sig'))
        order = shared['cockpitOrder']
        self.assertEqual(len(order), 19)
        self.assertEqual([pair[0] for pair in order][:3],
                         ['Standard Cockpit', 'Small Cockpit', 'Command Console'])
        self.assertEqual(order[10], ['Tripod Cockpit', 'Tripod'])
        self.assertEqual(order[18], ['Superheavy Tripod Industrial Cockpit',
                                     'Superheavy Tripod Industrial'])
        names = {name for pair in order for name in pair}
        # Every table key is a Java name; the three types the contract cannot
        # hold yet (Dual, Small Command, Superheavy Command) are Java names
        # without an identity.
        self.assertLessEqual(set(shared['cockpit']), names)
        absent = names - set(shared['cockpit'])
        self.assertEqual(absent, {'Dual Cockpit', 'Dual', 'Superheavy Command Console',
                                  'Superheavy Command', 'Small Command Console', 'Small Command'})

    def test_cockpits_loaded_as_standard_are_listed_and_really_map_to_standard(self):
        # The TypeScript importer warns for every Java cockpit that the catalog
        # (and CockpitType) can only hold as STANDARD; 4.1-g.2 empties this list.
        shared = json.loads(SHARED.read_text(encoding='utf-8-sig'))
        self.assertEqual(shared['cockpitLoadedAsStandard'], ['Tripod Cockpit'])
        for name in shared['cockpitLoadedAsStandard']:
            self.assertEqual(shared['cockpit'][name], 'STANDARD')
            self.assertIn(name, [pair[0] for pair in shared['cockpitOrder']])

    def test_tables_load_regardless_of_working_directory(self):
        probe = (
            "import sys; sys.path.insert(0, sys.argv[1]); import enum_mapping_tables as t; "
            "print(t.HEAT_SINK_TYPE_MAP['IS Double'], t.COCKPIT_TYPE_MAP['Tripod Cockpit'])"
        )
        with tempfile.TemporaryDirectory() as elsewhere:
            result = subprocess.run(
                [sys.executable, '-B', '-c', probe, str(CONVERSION)],
                cwd=elsewhere, capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.split(), ['DOUBLE', 'STANDARD'])

    def test_unreadable_shared_file_fails_loudly_instead_of_emptying_tables(self):
        real = Path.read_text

        def broken(path, *args, **kwargs):
            return '{' if path.name == SHARED.name else real(path, *args, **kwargs)

        try:
            with patch.object(Path, 'read_text', broken):
                with self.assertRaises(json.JSONDecodeError):
                    importlib.reload(enum_mapping_tables)
        finally:
            importlib.reload(enum_mapping_tables)


if __name__ == '__main__':
    unittest.main()
