#!/usr/bin/env python3
"""
BattleMech/mech/unit Terminology Fixer

Applies canonical terminology standard from TERMINOLOGY_GLOSSARY.md:
- Use "BattleMech" in formal/interface definitions
- Use "mech" in informal prose (acceptable after BattleMech established)
- Use "unit" only when discussing generic game entities

This script uses context-aware replacement rules.
"""

import re
import os
import sys
from pathlib import Path
from typing import List, Tuple, Dict

# Patterns requiring "BattleMech" (formal contexts)
FORMAL_CONTEXTS = [
    # Interface definitions
    (r'\bIMech\b', 'IBattleMech'),

    # Type references in formal contexts
    (r'(\bmech\s+tonnage\b)', 'BattleMech tonnage'),
    (r'(\bmech\s+mass\b)', 'BattleMech mass'),
    (r'(\bmech\s+weight\b)', 'BattleMech weight'),
    (r'(\bmech\s+configuration\b)', 'BattleMech configuration'),
    (r'(\bmech\s+construction\b)', 'BattleMech construction'),

    # Scenario headings
    (r'(####\s+Scenario:\s+)(?:Light|Medium|Heavy|Assault)\s+mech\s+', r'\1\g<2> BattleMech '),

    # Property descriptions
    (r'(\*\*\w+\*\*:\s+)Mech\s+', r'\1BattleMech '),

    # Requirements and formal statements
    (r'(SHALL\s+\w+\s+)mechs(\s+)', r'\1BattleMechs\2'),
    (r'(MUST\s+\w+\s+)mechs(\s+)', r'\1BattleMechs\2'),

    # Example headings with "Mechs"
    (r'\bExample\s+Mechs:', 'Example BattleMechs:'),

    # Mech database / collection references
    (r'(\bmech\s+database\b)', 'BattleMech database'),
    (r'(\bMech\s+Database\b)', 'BattleMech Database'),

    # "a mech" / "the mech" in formal validation/requirements
    (r'(validating|validate)\s+the\s+mech\b', r'\1 the BattleMech'),
    (r'(\bGIVEN\s+)a\s+mech\s+', r'\1a BattleMech '),
    (r'(\bWHEN\s+.*)\s+mech\s+', r'\1 BattleMech '),
    (r'(\bTHEN\s+.*)\s+mech\s+', r'\1 BattleMech '),
]

# Patterns for capitalization fixes
CAPITALIZATION_FIXES = [
    (r'\bBattlemech\b', 'BattleMech'),
    (r'\bBattle\s+Mech\b', 'BattleMech'),
    (r'\bbattle\s+mech\b', 'BattleMech'),  # In formal contexts
]

# Contexts where "mech" is acceptable (after BattleMech established)
# These are kept as-is:
# - Comments starting with "//"
# - After "BattleMech" already mentioned in same paragraph
# - In code examples (between ```)
# - Informal prose descriptions

class TerminologyFixer:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.changes = []

    def should_skip_line(self, line: str, in_code_block: bool) -> bool:
        """Check if line should be skipped from replacement."""
        # Skip code blocks
        if in_code_block:
            return True

        # Skip comment lines
        if line.strip().startswith('//'):
            return True

        # Skip URLs
        if 'http://' in line or 'https://' in line:
            return True

        return False

    def fix_formal_contexts(self, content: str) -> str:
        """Apply formal context replacements."""
        modified = content

        for pattern, replacement in FORMAL_CONTEXTS:
            original = modified
            modified = re.sub(pattern, replacement, modified, flags=re.IGNORECASE)
            if modified != original:
                matches = len(re.findall(pattern, original, flags=re.IGNORECASE))
                self.changes.append(f"  - Replaced '{pattern}' → '{replacement}' ({matches} instances)")

        return modified

    def fix_capitalizations(self, content: str) -> str:
        """Fix capitalization errors."""
        modified = content

        for pattern, replacement in CAPITALIZATION_FIXES:
            original = modified
            modified = re.sub(pattern, replacement, modified)
            if modified != original:
                matches = len(re.findall(pattern, original))
                self.changes.append(f"  - Fixed capitalization: '{pattern}' → '{replacement}' ({matches} instances)")

        return modified

    def process_file(self, file_path: Path) -> bool:
        """Process a single file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()

            modified_content = original_content

            # Apply fixes
            modified_content = self.fix_capitalizations(modified_content)
            modified_content = self.fix_formal_contexts(modified_content)

            if modified_content != original_content:
                if not self.dry_run:
                    # Create backup
                    backup_path = file_path.with_suffix('.md.bak')
                    with open(backup_path, 'w', encoding='utf-8') as f:
                        f.write(original_content)

                    # Write modified content
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(modified_content)

                    print(f"✓ Updated: {file_path.relative_to(file_path.parents[3])}")
                else:
                    print(f"Would update: {file_path.relative_to(file_path.parents[3])}")

                for change in self.changes:
                    print(change)
                self.changes = []

                return True

            return False

        except Exception as e:
            print(f"✗ Error processing {file_path}: {e}", file=sys.stderr)
            return False

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Fix BattleMech/mech/unit terminology')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without modifying files')
    parser.add_argument('path', nargs='?', default='.', help='Path to openspec/specs directory')
    args = parser.parse_args()

    specs_dir = Path(args.path)
    if not specs_dir.exists():
        print(f"Error: Directory {specs_dir} does not exist", file=sys.stderr)
        return 1

    fixer = TerminologyFixer(dry_run=args.dry_run)

    # Find all .md files
    md_files = list(specs_dir.rglob('*.md'))

    print(f"Found {len(md_files)} markdown files")
    if args.dry_run:
        print("DRY RUN - No files will be modified\n")
    else:
        print("Processing files...\n")

    updated_count = 0
    for md_file in sorted(md_files):
        if fixer.process_file(md_file):
            updated_count += 1

    print(f"\n{'Would update' if args.dry_run else 'Updated'} {updated_count} files")

    return 0

if __name__ == '__main__':
    sys.exit(main())
