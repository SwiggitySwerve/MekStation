#!/usr/bin/env bash
# Legacy fixer retired: use the shared, reviewed fixer explicitly.
# No files are changed by this compatibility entry point.
printf '%s\n' 'fix-terminology.sh is retired. Use npm run terminology:fix:dry-run, review the output, then npm run terminology:fix.' >&2
exit 1
