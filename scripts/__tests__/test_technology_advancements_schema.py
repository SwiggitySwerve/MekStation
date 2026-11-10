"""Shared conformance cases for the Python gate and generated Zod contract."""

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from jsonschema import Draft7Validator
from referencing.exceptions import Unresolvable

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/megameklab-conversion"))
import schema_gate


def conformance_cases():
    stage = {"year": -1, "approximate": False}
    side = {name: copy.deepcopy(stage) for name in
            ("prototype", "production", "common", "extinct", "reintroduced")}
    fact = {
        "techBase": "ALL", "staticTechLevel": "STANDARD",
        "advancement": {"IS": copy.deepcopy(side), "CLAN": copy.deepcopy(side)},
        "factions": {name: [] for name in ("prototype", "production", "extinct", "reintroduced")},
    }
    # Deliberately retain punctuation/case and blank dates on both sides.
    native = "Native Type (Exact) / 1"
    document = {native: fact}
    cases = [{"name": "ALL with known missing dates", "document": document, "accepted": True}]

    def changed(name, path, value=None, remove=False, accepted=False):
        data = copy.deepcopy(document)
        target = data
        for key in path[:-1]:
            target = target[key]
        if remove:
            del target[path[-1]]
        else:
            target[path[-1]] = value
        cases.append({"name": name, "document": data, "accepted": accepted})

    for base in ("IS", "CLAN"):
        changed(base + " support is preserved", [native, "techBase"], base, accepted=True)
    for level in ("INTRO", "ADVANCED", "EXPERIMENTAL", "UNOFFICIAL"):
        changed(level + " static level", [native, "staticTechLevel"], level, accepted=True)
    for side_name in ("IS", "CLAN"):
        for phase in side:
            path = [native, "advancement", side_name, phase]
            changed(side_name + " " + phase + " approximate date", path,
                    {"year": 1950, "approximate": True}, accepted=True)
            changed(side_name + " " + phase + " missing", path, remove=True)
    changed("distinct native keys", ["Another native"], copy.deepcopy(fact), accepted=True)
    changed("native ALL is not binary BOTH", [native, "techBase"], "BOTH")
    changed("no derived legality cache", [native, "legal"], True)
    changed("unknown side", [native, "advancement", "BOTH"], copy.deepcopy(side))
    changed("missing side", [native, "advancement", "CLAN"], remove=True)
    changed("missing factions", [native, "factions"], remove=True)
    changed("unknown static level", [native, "staticTechLevel"], "STANDARD_CLAN")
    for field in ("year", "approximate"):
        changed("missing stage " + field, [native, "advancement", "IS", "prototype", field], remove=True)
    for value in (-2, 1.5, "1950", None, True):
        changed("invalid year " + repr(value), [native, "advancement", "IS", "prototype", "year"], value)
    changed("invalid approximate", [native, "advancement", "IS", "prototype", "approximate"], 1)
    changed("stage extra property", [native, "advancement", "IS", "prototype", "cached"], 1950)
    changed("unique native factions", [native, "factions", "prototype"], ["TH", "CWF"], accepted=True)
    changed("duplicate factions", [native, "factions", "prototype"], ["TH", "TH"])
    changed("invalid faction spelling", [native, "factions", "prototype"], ["clan"])
    changed("no common faction set", [native, "factions", "common"], [])
    cases.extend([
        {"name": "empty sidecar", "document": {}, "accepted": False},
        {"name": "empty native key", "document": {"": fact}, "accepted": False},
        {"name": "null facts", "document": {native: None}, "accepted": False},
    ])
    return cases


class TechnologyAdvancementsSchemaTest(unittest.TestCase):
    def test_conformance_and_no_normalization(self):
        for case in conformance_cases():
            with self.subTest(case=case["name"]):
                before = copy.deepcopy(case["document"])
                errors = schema_gate.validate_technology_advancements(case["document"])
                self.assertEqual(not errors, case["accepted"], errors)
                self.assertEqual(case["document"], before)

    def test_registered_external_and_fragment_references(self):
        validator = schema_gate._get_validator("technology_advancements")
        Draft7Validator.check_schema(validator.schema)
        uri = validator.schema["$id"]
        reference = Draft7Validator({"$ref": uri}, registry=validator._registry)
        fact_reference = Draft7Validator({"$ref": uri + "#/$defs/fact"}, registry=validator._registry)
        data = conformance_cases()[0]["document"]
        self.assertFalse(list(reference.iter_errors(data)))
        self.assertFalse(list(fact_reference.iter_errors(next(iter(data.values())))))
        self.assertTrue(list(fact_reference.iter_errors({})))
        with self.assertRaises(Unresolvable):
            Draft7Validator({"$ref": "https://invalid.example/unregistered.json"},
                            registry=validator._registry).validate({})

    def test_arbitrary_working_directory(self):
        code = (
            "import sys; sys.path.insert(0, sys.argv[1]); "
            "from schema_gate import validate_technology_advancements; "
            "assert validate_technology_advancements({})"
        )
        with tempfile.TemporaryDirectory() as cwd:
            subprocess.run([sys.executable, "-B", "-c", code,
                            str(ROOT / "scripts/megameklab-conversion")], cwd=cwd, check=True)


if __name__ == "__main__":
    if sys.argv[1:] == ["--cases"]:
        print(json.dumps(conformance_cases()))
    else:
        unittest.main()
