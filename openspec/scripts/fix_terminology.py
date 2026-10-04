#!/usr/bin/env python3
"""Retired legacy entry point; never rewrite contracts through shadow rules."""
import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("path", nargs="?", default=".")
    parser.parse_args()
    print(
        "fix_terminology.py is retired. Use npm run terminology:fix:dry-run, "
        "review the output, then npm run terminology:fix.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
