# desktop-local-services Delta — harden-desktop-and-api-security

## MODIFIED Requirements

### Requirement: File System Access

The system SHALL provide secure file system operations through IPC with native
dialogs. Renderer-supplied file paths for read, write, and backup-restore operations
SHALL be confined to an allowlist of resolved application sandbox roots: any path
that, once its real location is resolved, falls outside the allowed roots SHALL be
rejected with a structured error and SHALL NOT reach the file system.

**Rationale**: Renderer process cannot access Node.js fs module directly due to
security. The IPC handlers that DO touch `fs` must additionally confine the
renderer-supplied path so a compromised or malicious renderer cannot read or
overwrite arbitrary files the user account can access.

**Priority**: Critical

#### Scenario: Save file with dialog

- **GIVEN** the user wants to save a unit file
- **WHEN** `electronAPI.saveFile(defaultPath, filters)` is called
- **THEN** display native save dialog with filters
- **AND** return `{ canceled: boolean, filePath?: string }`
- **AND** NOT write file contents (caller handles write)

#### Scenario: Open file with dialog

- **GIVEN** the user wants to open a unit file
- **WHEN** `electronAPI.openFile(filters)` is called
- **THEN** display native open dialog with filters
- **AND** return `{ canceled: boolean, filePaths: string[] }`
- **AND** support multi-select if configured

#### Scenario: Read file contents

- **GIVEN** a valid file path
- **WHEN** `electronAPI.readFile(filePath)` is called
- **THEN** read file contents from disk
- **AND** return `{ success: true, data: string }` on success
- **AND** return `{ success: false, error: string }` on failure
- **AND** handle encoding as UTF-8

#### Scenario: Write file contents

- **GIVEN** a valid file path and data
- **WHEN** `electronAPI.writeFile(filePath, data)` is called
- **THEN** write data to disk as UTF-8
- **AND** return `{ success: true }` on success
- **AND** return `{ success: false, error: string }` on failure
- **AND** create parent directories if needed

#### Scenario: Select directory

- **GIVEN** the user needs to choose a directory
- **WHEN** `electronAPI.selectDirectory()` is called
- **THEN** display native directory picker
- **AND** return `{ canceled: boolean, filePaths: string[] }`
- **AND** filePaths[0] contains selected directory path

#### Scenario: Read confined to sandbox root

- **GIVEN** the renderer invokes `read-file` with a path that resolves outside every
  allowed sandbox root
- **WHEN** the main-process `read-file` handler processes it
- **THEN** the handler SHALL reject with `{ success: false, error: <path-outside-root> }`
  before calling `fs.readFile`
- **AND** a path that resolves inside an allowed root SHALL be read normally.

#### Scenario: Write confined to sandbox root

- **GIVEN** the renderer invokes `write-file` (or `restore-backup`) with a path that
  resolves outside every allowed sandbox root
- **WHEN** the main-process handler processes it
- **THEN** the handler SHALL reject before calling `fs.writeFile` / restore
- **AND** a path that resolves inside an allowed root SHALL be written / restored
  normally.

#### Scenario: Traversal and symlink escapes are rejected

- **GIVEN** a renderer-supplied path uses `..` traversal or a symlink whose real
  target is outside the allowed roots
- **WHEN** the handler resolves the path's real location and checks containment
- **THEN** the resolved-real-path containment check SHALL reject the operation
- **AND** the file system SHALL NOT be touched for that request.

## ADDED Requirements

### Requirement: Desktop Verification Coverage in CI

The desktop target SHALL be covered by the blocking pull-request verification gate:
its TypeScript sources SHALL be typechecked and its own test suite SHALL run in CI,
and both SHALL be wired so a desktop regression fails the required pull-request
check rather than being gated only by "compiles + packages."

#### Scenario: Desktop sources are typechecked in CI

- **GIVEN** a pull request changes desktop TypeScript sources
- **WHEN** the pull-request verification workflow runs
- **THEN** a typecheck step SHALL compile the desktop sources
- **AND** a desktop type error SHALL fail the required pull-request check.

#### Scenario: Desktop test suite runs in CI

- **GIVEN** the pull-request verification workflow runs
- **WHEN** the desktop test lane executes
- **THEN** the desktop's own test suite SHALL be invoked
- **AND** a failing desktop test SHALL fail the required pull-request check.

#### Scenario: Desktop lanes gate the required aggregate check

- **GIVEN** the workflow's required-check aggregator
- **WHEN** its dependency list is inspected
- **THEN** the desktop typecheck and desktop test jobs SHALL be among its
  dependencies
- **AND** the required check SHALL NOT report success while a desktop lane fails.
