"""Independent JSON Schema consumer; no application or conversion imports.

Run with Python plus jsonschema: python scripts/__tests__/test_portable_source_provenance.py
"""

import hashlib
import json
from pathlib import Path
import unittest

from jsonschema import Draft7Validator


ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "public/data/equipment/_schema/source-provenance-schema.json"
FIXTURES = ROOT / "src/types/contracts/__tests__/fixtures/source-provenance.json"


class PortableSourceProvenanceTest(unittest.TestCase):
    def test_shared_conformance_cases(self):
        schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
        Draft7Validator.check_schema(schema)
        validator = Draft7Validator(schema)
        fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))
        self.assertTrue(fixtures["cases"])
        original = bytes.fromhex(fixtures["originalBytesHex"])
        digest = hashlib.sha256(original).hexdigest()
        self.assertNotEqual(digest, hashlib.sha256(original.replace(b"\r\n", b"\n")).hexdigest())
        for case in fixtures["cases"]:
            with self.subTest(case=case["name"]):
                errors = list(validator.iter_errors(case["document"]))
                print(json.dumps({
                    "case": case["name"], "accepted": not errors,
                    "errors": [{"path": list(error.absolute_path), "message": error.message}
                               for error in errors],
                }, ensure_ascii=True))
                self.assertEqual(not errors, case["accepted"])
                if not errors:
                    document = case["document"]
                    self.assertEqual(json.loads(json.dumps(document)), document)
                    self.assertTrue(all(source["sha256"] == digest for source in document["sources"]))
                    for row in document["sources"]:
                        source = row["source"]
                        if source["kind"] == "git":
                            algorithm = "sha1" if len(source["blob"]) == 40 else "sha256"
                            blob = b"blob " + str(len(original)).encode("ascii") + b"\0" + original
                            self.assertEqual(hashlib.new(algorithm, blob).hexdigest(), source["blob"])


if __name__ == "__main__":
    unittest.main()
