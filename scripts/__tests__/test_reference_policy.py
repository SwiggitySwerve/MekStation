"""Independent native-source expectations must never learn from oracle rows."""
import json
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
import reference_policy_sources as rules
from reference_policy import goal_pins, invocation_settings
from reference_policy_units import PinnedTree, VerifierDispatch


class ReferencePolicyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sources = json.loads((Path(__file__).parent / 'fixtures/reference_policy_sources.json').read_text())

    def test_xml_values_override_native_defaults_but_absent_fields_use_source_initializers(self):
        profiles, citations = rules.option_profiles(self.sources, '<entityverifier><mek><maxOverweight>0</maxOverweight></mek></entityverifier>')
        self.assertEqual(profiles['mek']['getMaxOverweight'], 0)
        self.assertEqual(profiles['mek']['getWeightCeilingTurret'], 'HALF_TON')
        self.assertEqual(profiles['mek']['showUnderweightEntity'], False)
        self.assertEqual(set(profiles['mek']), set(citations['mek']))
        self.assertIn('TestXMLOption.java', citations['mek']['getWeightCeilingTurret'])

    def test_changed_config_changes_expectation_without_any_reference_input(self):
        first, _ = rules.option_profiles(self.sources, '<entityverifier><mek><maxOverweight>0.1</maxOverweight></mek></entityverifier>')
        second, _ = rules.option_profiles(self.sources, '<entityverifier><mek><maxOverweight>0.2</maxOverweight></mek></entityverifier>')
        self.assertEqual((first['mek']['getMaxOverweight'], second['mek']['getMaxOverweight']), (0.1, 0.2))

    def test_native_mtf_rules_and_blk_year_exception_not_converter_labels(self):
        tables = rules.tech_tables(self.sources)
        self.assertEqual(rules.tech_level('a.mtf', 'TechBase:Inner Sphere\nRules Level:1', tables), 0)
        self.assertEqual(rules.tech_level('a.mtf', 'TechBase:Mixed (Clan Chassis)\nRules Level:4', tables), 8)
        self.assertEqual(rules.tech_level('a.blk', '<year>3025</year>\n<type>IS</type>', tables), 0)
        self.assertEqual(rules.tech_level('a.blk', '<year>3026</year>\n<type>IS</type>', tables), 1)

    def test_undocumented_tech_and_getter_are_explicitly_unspecified(self):
        self.assertIsNone(rules.tech_level('a.blk', '<year>3025</year><type>Unknown</type>', rules.tech_tables(self.sources)))
        source = dict(self.sources)
        source['verifier/TestEntityOption.java'] += '\nint undocumented();\n'
        profiles, citations = rules.option_profiles(source, '<entityverifier><mek/></entityverifier>')
        self.assertIsNone(profiles['mek']['undocumented'])
        self.assertIn('unspecified', citations['mek']['undocumented'])

    def test_missing_independent_goal_or_invocation_documentation_rejects(self):
        with self.assertRaisesRegex(ValueError, 'goal pins'):
            goal_pins('Use current upstream main')
        with self.assertRaisesRegex(ValueError, 'invocation settings'):
            invocation_settings('unknown invocation', 'unknown source')

    def test_unknown_xml_scalar_is_unspecified_not_a_string_that_can_match(self):
        for unknown in ('undocumented', 'UNDOCUMENTED', 'true'):
            profiles, citations = rules.option_profiles(self.sources, f'<entityverifier><mek><maxOverweight>{unknown}</maxOverweight></mek></entityverifier>')
            self.assertIsNone(profiles['mek']['getMaxOverweight'])
            self.assertIn('unspecified', citations['mek']['getMaxOverweight'])
        profiles, _ = rules.option_profiles(self.sources, '<entityverifier><mek><ceilWeight><engine>UNDOCUMENTED</engine></ceilWeight></mek></entityverifier>')
        self.assertIsNone(profiles['mek']['getWeightCeilingEngine'])

    def test_immutable_git_blobs_ignore_dirty_worktree_and_are_repeatable(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            def git(*args):
                return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE).decode().strip()

            git('init', '-q')
            path = root / 'data/mekfiles/meks/Test.mtf'
            path.parent.mkdir(parents=True)
            path.write_text('TechBase:Inner Sphere\nRules Level:1\n', encoding='utf-8')
            (root / '.gitattributes').write_text('*.mtf text eol=crlf\n', encoding='utf-8')
            git('add', '--', '.gitattributes', 'data/mekfiles/meks/Test.mtf')
            git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture')
            pin = git('rev-parse', 'HEAD')
            path.write_text('TechBase:Unknown\n', encoding='utf-8')
            tree = PinnedTree(root, pin)
            first = list(tree.unit_blobs())
            self.assertEqual(first, list(tree.unit_blobs()))
            self.assertEqual(first[0][1], tree.read('data/mekfiles/meks/Test.mtf').encode())
            self.assertIn(b'Rules Level:1', first[0][1])
            with self.assertRaises(ValueError):
                PinnedTree(root, 'HEAD')

    def test_dispatch_uses_native_flags_and_support_precedence(self):
        class Tree:
            java = {'Mek', 'Tank', 'Support', 'Fighter', 'Aero'}

            def source(self, name):
                return {
                    'EntityVerifier': '@XmlElement(name = "mek") public TestXMLOption mekOption;\n@XmlElement(name = "tank") public TestXMLOption tankOption;\n@XmlElement(name = "aero") public TestXMLOption aeroOption;',
                    'TestEntity': 'private int gameYear = -1; if (unit.hasETypeFlag(Entity.ETYPE_MEK)) { testEntity = new TestMek((Mek) unit, entityVerifier.mekOption, null); } else if (unit.isSupportVehicle()) { testEntity = new TestSupportVehicle(unit, entityVerifier.tankOption, null); } else if (unit.hasETypeFlag(Entity.ETYPE_TANK) && !unit.hasETypeFlag(Entity.ETYPE_GUN_EMPLACEMENT)) { testEntity = new TestTank((Tank) unit, entityVerifier.tankOption, null); } else if (unit.hasETypeFlag(Entity.ETYPE_AERO)) { testEntity = new TestAero((Aero) unit, entityVerifier.aeroOption, null); }',
                    'MekFileParser': 'case "Aero", "Fighter" -> new BLKFighterFile(bb); case "Support" -> new BLKSupportFile(bb);',
                    'Mek': 'public long getEntityType() { return Entity.ETYPE_MEK; }',
                    'Tank': 'public long getEntityType() { return Entity.ETYPE_TANK; }',
                    'Aero': 'public long getEntityType() { return Entity.ETYPE_AERO; }',
                    'Fighter': 'class Fighter extends Aero { public long getEntityType() { return super.getEntityType() | Entity.ETYPE_AEROSPACE_FIGHTER; } }',
                    'Support': 'class Support extends Fighter { public boolean isSupportVehicle() { return true; } }',
                    'BLKFighterFile': 'Fighter a = new Fighter();',
                    'BLKSupportFile': 'Support a = new Support();',
                }[name]

        dispatch = VerifierDispatch(Tree())
        self.assertEqual(dispatch.profile('a.blk', '<UnitType>Support</UnitType>'), 'tank')
        self.assertEqual(dispatch.profile('a.blk', '<UnitType>Aero</UnitType>'), 'aero')
        self.assertEqual(dispatch.for_class('Tank'), 'tank')
        self.assertIsNone(dispatch.profile('a.blk', '<UnitType>FutureType</UnitType>'))


if __name__ == '__main__':
    unittest.main()
