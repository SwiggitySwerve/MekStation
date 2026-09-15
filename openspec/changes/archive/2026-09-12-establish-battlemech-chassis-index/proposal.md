# Establish the BattleMech chassis index

## Why

The printable-model research needs one chassis identity per design before source records or previews can be attached. The bundled catalog currently lists variants, while alternate Clan names and similarly named successor chassis need explicit treatment.

## What Changes

- Derive a versioned, deterministic chassis index from the bundled BattleMech unit index.
- Preserve catalog names, unit IDs, variant metadata, and explicit alternate-name mappings.
- Expose a read-only API and a searchable Compendium page with shareable chassis selection and variant links.
- Establish chassis IDs as the future model-library attachment boundary.

## Non-goals

Model acquisition, downloads, rights approval, preview rendering, gameplay changes, custom-unit grouping, and automatic fuzzy identity merging are excluded.

## Impact

Adds the `battlemech-chassis-index` capability alongside the existing `unit-services` and `compendium-browser` specifications. Uses the current Pages Router and bundled catalog; adds no dependencies or database schema. Weight, technology, introduction year, and rules level remain variant facts, including mixed technology and unofficial records.
