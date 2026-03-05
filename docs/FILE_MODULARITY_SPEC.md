# File Modularity and Size Design Specification

Status: Active
Audience: Human contributors and coding agents
Scope: `src/**/*.ts`, `src/**/*.tsx`

## Purpose

This specification defines file-size targets and modularization rules so the
codebase stays readable, testable, and easy to refactor without API churn.

If uncertain, use this default:

- Target runtime file size: about 300 lines.

## Module Categories and Targets

Use the category that best matches the file's primary role.

| Category                                                        | Target  | Soft Max | Hard Guardrail | Notes                                            |
| --------------------------------------------------------------- | ------- | -------- | -------------- | ------------------------------------------------ |
| Runtime logic (`services`, reducers, gameplay/simulation logic) | 250-350 | 400      | 500            | Prefer focused modules by concern                |
| High-churn runtime logic                                        | 200-300 | 350      | 450            | Keep hot paths easier to reason about            |
| React container/orchestrator components                         | 300-450 | 500      | 600            | Split UI composition from helpers/state adapters |
| React presentational components                                 | 120-300 | 350      | 400            | Keep rendering concerns isolated                 |
| Type/interface files                                            | 250-500 | 700      | 900            | Split when mixed domains appear                  |
| Declarative catalogs/constants                                  | 400-800 | 1000     | 1200           | Large data-only files are acceptable             |

Notes:

- Tests are exempt from strict limits, but should still remain navigable.
- Generated files are exempt.

## Split Triggers

Split a file when any of these are true:

1. File exceeds its Soft Max and has 2 or more responsibilities.
2. Runtime logic file exceeds 500 lines.
3. New changes would increase a file that is already over Soft Max by more than
   about 40 lines, and extraction is practical.
4. File has clear responsibility boundaries (for example, calculations +
   orchestration + formatting in one module).

## Responsibility Heuristics

Treat a file as multi-responsibility when it contains two or more of the
following:

- Domain calculations plus event/state orchestration
- Data model/types plus behavior-heavy logic
- Multiple distinct feature clusters with separate call paths
- UI rendering plus non-trivial business logic
- Parsing/IO concerns mixed with transformation/business rules

## Modularization Rules

When splitting files, follow these rules:

1. Preserve public API compatibility with a facade file when possible.
2. Extract by responsibility, not by arbitrary line ranges.
3. Keep names explicit: `[Feature][Aspect].ts` or `[Feature][Aspect].tsx`.
4. Avoid circular dependencies.
5. Keep tests aligned with extracted modules (co-locate or update imports).
6. Prefer smaller, reversible commits grouped by module family.

## Facade Pattern (Preferred)

When a module has many consumers, keep the original entrypoint path stable:

- Existing file remains as facade/export surface.
- New focused modules hold internal implementation.
- External callers keep importing from the same path.

## Agent Execution Protocol

All agents should apply this protocol before and during refactors:

1. Classify file category from this spec.
2. Check current size against category targets.
3. If split trigger is met, propose and execute a responsibility-based split.
4. Preserve facade exports unless a migration is explicitly requested.
5. Run verification (`typecheck`, relevant tests, build if applicable).
6. Document rationale when deliberately keeping an oversized file.

## Priority Guidance for Current Codebase

When planning modularization work, prioritize runtime behavior files over large
declarative catalogs.

Typical order:

1. Gameplay and simulation runtime logic
2. Service orchestration modules
3. UI container/orchestrator components
4. Type and catalog files (only when they mix concerns or exceed hard limits)

## Non-Goals

- Enforcing a single line count for every file type
- Splitting declarative data files just to satisfy arbitrary size targets
- API-breaking module moves without explicit migration planning
