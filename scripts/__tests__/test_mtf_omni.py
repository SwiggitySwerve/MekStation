"""OmniMek source facts (MegaMek 48fcb2f64 MtfFile.java): `Config:` containing "Omni" (:358-359), the raw
`base chassis heat sinks:` line (:371, :1717-1718) and the `clanname:` line (:326, :1745-1746)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_converter import MTFParser, dataclass_to_dict


def convert(*lines):
    source = ['chassis:Test', 'model:One', 'mass:50', *lines]
    return dataclass_to_dict(MTFParser()._parse_lines(source, 'source.mtf'))


class OmniFactsTest(unittest.TestCase):
    def test_omni_source_keeps_the_three_facts(self):
        unit = convert('Config:Biped OmniMek', 'heat sinks:12 Double',
                       'base chassis heat sinks:12', 'clanname:Nova')
        self.assertIs(unit['isOmni'], True)
        self.assertEqual(unit['baseChassisHeatSinks'], 12)
        self.assertEqual(unit['clanName'], 'Nova')

    def test_every_omni_geometry_is_omni(self):
        # The suffix, not the geometry, decides: a Biped-only rule would miss three of these.
        for config in ('Biped OmniMek', 'Quad OmniMek', 'QuadVee OmniMek', 'Tripod OmniMek'):
            with self.subTest(config=config):
                self.assertIs(convert(f'Config:{config}')['isOmni'], True)

    def test_non_omni_units_gain_no_key_at_all(self):
        for config in ('Biped', 'Quad', 'LAM', 'Tripod', 'Biped FrankenMek'):
            with self.subTest(config=config):
                unit = convert(f'Config:{config}')
                self.assertNotIn('isOmni', unit)  # absent, not False
                self.assertNotIn('baseChassisHeatSinks', unit)
                self.assertNotIn('clanName', unit)

    def test_omni_match_is_case_sensitive_like_java_contains(self):
        self.assertNotIn('isOmni', convert('Config:Biped omnimek'))

    def test_raw_base_heat_sinks_below_ten_are_not_normalised(self):
        # Java stores `raw >= 10 ? raw : total heat sinks` (MtfFile.java:601-606); the catalog keeps the source value (D-R2c).
        unit = convert('Config:Biped OmniMek', 'heat sinks:12 Double', 'base chassis heat sinks:8')
        self.assertEqual(unit['baseChassisHeatSinks'], 8)
        self.assertEqual(unit['heatSinks']['count'], 12)

    def test_clan_name_is_kept_on_a_non_omni_unit(self):
        # 67 of the 434 pinned clanname lines are on units that are not OmniMeks.
        unit = convert('Config:Biped', 'clanname:Howler')
        self.assertEqual(unit['clanName'], 'Howler')
        self.assertNotIn('isOmni', unit)

    def test_blank_clan_name_is_omitted(self):
        self.assertNotIn('clanName', convert('Config:Biped OmniMek', 'clanname:   '))

    def test_malformed_base_heat_sinks_raise_with_the_line(self):
        # Java's Integer.parseInt throws and the unit fails to load; the converter must not drop the fact silently.
        with self.assertRaisesRegex(ValueError, r'base chassis heat sinks.*ten'):
            convert('Config:Biped OmniMek', 'base chassis heat sinks:ten')

    def test_new_keys_follow_component_tech_bases_in_the_serialized_order(self):
        unit = convert('Config:Biped OmniMek', 'techbase:Mixed (Clan Chassis)', 'rules level:2',
                       'base chassis heat sinks:10', 'clanname:Nova')
        keys = list(unit)
        self.assertEqual(keys[-4:], ['componentTechBases', 'isOmni', 'baseChassisHeatSinks', 'clanName'])


if __name__ == '__main__':
    unittest.main()
