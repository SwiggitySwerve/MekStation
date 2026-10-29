"""Pinned source coverage must not depend on a converter's directory allowlist."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CONVERSION = Path(__file__).resolve().parents[1] / "megameklab-conversion"
sys.path.insert(0, str(CONVERSION))
from source_inventory import build_inventory, InventoryError


class SourceInventoryTest(unittest.TestCase):
    REPOSITORY = "https://example.invalid/fixtures/unit-sources"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "core.autocrlf", "false")
        self.files = {
            "data/mekfiles/meks/A.MTF": b"Config:QuadVee\n",
            "data/mekfiles/vehicles/Space name.blk": b"<UnitType>FixedWingSupport</UnitType>\n",
            "data/mekfiles/other/Space name.blk": b"<UnitType>FixedWingSupport</UnitType>\n",
            "data/mekfiles/support/Card.bfs": b"assetType: Emplacement\n",
            "data/mekfiles/metadata.txt": b"not a unit\n",
            "data/mekfiles/archive.zip": b"inventory only; expansion is separate\n",
            "outside.mtf": b"not in source tree\n",
        }
        for path, content in self.files.items():
            target = self.repo / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        self.git("add", ".")
        self.git("-c", "user.name=Inventory Test", "-c", "user.email=test@example.invalid",
                 "commit", "-qm", "Fixture")
        self.commit = self.git("rev-parse", "HEAD").decode().strip()

    def git(self, *args, input=None):
        return subprocess.run(["git", "-C", str(self.repo), *args], input=input,
                              check=True, capture_output=True).stdout

    def inventory(self, commit=None):
        return build_inventory(self.repo, commit or self.commit,
                               repository=self.REPOSITORY)

    def test_repository_identity_is_explicit_and_retained(self):
        report = self.inventory()
        self.assertEqual(report["repository"], self.REPOSITORY)
        fork = build_inventory(self.repo, self.commit,
                               repository="https://example.invalid/fork/units")
        self.assertEqual(fork["repository"], "https://example.invalid/fork/units")
        self.assertEqual(report["entries"], fork["entries"])

    def test_empty_or_padded_repository_identity_fails(self):
        for repository in ["", " ", "\n", " https://example.invalid/units"]:
            with self.subTest(repository=repository), self.assertRaises(InventoryError):
                build_inventory(self.repo, self.commit, repository=repository)

    def test_complete_formats_paths_and_hashes_without_deduplication(self):
        report = self.inventory()
        self.assertEqual(report["commit"], self.commit)
        self.assertEqual(report["schemaVersion"], 1)
        self.assertEqual(report["summary"]["byFormat"], {"blk": 2, "bfs": 1, "mtf": 1})
        self.assertEqual(report["summary"]["sourceFiles"], 4)
        self.assertEqual(report["summary"]["otherFiles"], 1)
        self.assertEqual(report["summary"]["archiveFiles"], 1)
        self.assertEqual(report["entityLoading"], "not-run")
        self.assertEqual(report["parity"], "not-run")
        entries = report["entries"]
        self.assertEqual([r["path"] for r in entries], sorted(r["path"] for r in entries))
        self.assertEqual(len(entries), 6)
        for entry in entries:
            self.assertEqual(entry["sha256"], hashlib.sha256(self.files[entry["path"]]).hexdigest())
            self.assertEqual(entry["bytes"], len(self.files[entry["path"]]))
            self.assertEqual(entry["blob"], self.git("rev-parse", f"{self.commit}:{entry['path']}").decode().strip())

    def test_dirty_files_do_not_change_pinned_result(self):
        before = self.inventory()
        (self.repo / "data/mekfiles/meks/A.MTF").write_text("changed", encoding="utf-8")
        (self.repo / "data/mekfiles/support/Card.bfs").unlink()
        (self.repo / "data/mekfiles/untracked.blk").write_text("untracked", encoding="utf-8")
        self.assertEqual(before, self.inventory())

    def test_requires_full_existing_commit_not_branch_or_abbreviation(self):
        for revision in ["HEAD", self.commit[:8], "0" * 40, "--all"]:
            with self.subTest(revision=revision), self.assertRaises(InventoryError):
                self.inventory(revision)

    def test_git_replace_cannot_change_pinned_blob_contents(self):
        before = self.inventory()
        original = self.git("rev-parse", f"{self.commit}:data/mekfiles/meks/A.MTF").decode().strip()
        replacement = self.git("hash-object", "-w", "--stdin", input=b"Config:Biped\n").decode().strip()
        self.git("replace", original, replacement)
        self.assertEqual(before, self.inventory())

    def test_empty_source_denominator_fails(self):
        self.git("rm", "-qr", "data/mekfiles")
        self.git("-c", "user.name=Inventory Test", "-c", "user.email=test@example.invalid",
                 "commit", "-qm", "Empty source tree")
        commit = self.git("rev-parse", "HEAD").decode().strip()
        with self.assertRaisesRegex(InventoryError, "no source definitions"):
            self.inventory(commit)

    def test_nonregular_source_entry_cannot_claim_coverage(self):
        blob = self.git("hash-object", "-w", "--stdin", input=b"../outside.mtf").decode().strip()
        self.git("update-index", "--add", "--cacheinfo", f"120000,{blob},data/mekfiles/link.mtf")
        self.git("-c", "user.name=Inventory Test", "-c", "user.email=test@example.invalid",
                 "commit", "-qm", "Symlink fixture")
        commit = self.git("rev-parse", "HEAD").decode().strip()
        with self.assertRaisesRegex(InventoryError, "non-regular"):
            self.inventory(commit)

    def test_cli_emits_machine_readable_deterministic_report(self):
        command = [sys.executable, "-B", str(CONVERSION / "source_inventory.py"),
                   "--repo", str(self.repo), "--repository", self.REPOSITORY, "--commit", self.commit]
        first = subprocess.run(command, check=True, capture_output=True)
        second = subprocess.run(command, check=True, capture_output=True)
        self.assertEqual(first.stdout, second.stdout)
        self.assertEqual(json.loads(first.stdout), self.inventory())
        failure = subprocess.run(command[:-1] + ["HEAD"], capture_output=True)
        self.assertNotEqual(failure.returncode, 0)
        self.assertEqual(failure.stdout, b"")
        self.assertIn(b"full commit", failure.stderr)
        identity_index = command.index("--repository")
        missing_identity = subprocess.run(command[:identity_index] + command[identity_index + 2:],
                                          capture_output=True)
        self.assertNotEqual(missing_identity.returncode, 0)
        self.assertEqual(missing_identity.stdout, b"")
        self.assertIn(b"--repository", missing_identity.stderr)


if __name__ == "__main__":
    unittest.main()
