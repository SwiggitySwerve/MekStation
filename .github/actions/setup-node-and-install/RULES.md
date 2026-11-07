# Platform-specific caches

This action owns the shared browser/native-module cache namespace. Linux keys
include distribution ID, release and runner architecture from validated
`/etc/os-release` data. Never evaluate that file as shell code, fall back to
generic Linux keys, or add restore prefixes that cross release boundaries.
Windows and macOS keep their existing namespaces. npm tarballs, Next build
cache, assets and Electron downloads retain their existing cache policies.

The eleven Linux browser legs use Ubuntu 24.04, supported by Playwright 1.57.0.
Browser jobs opt into a real native SQLite load/query check after install or
restore. Cold browser misses must run the full installer; warm hits still
install system dependencies. No new jobs or test-census changes are needed.

This containment does not establish a fix for G6-042 teardown SIGSEGV.
Upgrading to Playwright 1.61+ (Ubuntu 26.04 support and a Chromium major change)
requires a separate owner-visible dependency decision and regression proof.
