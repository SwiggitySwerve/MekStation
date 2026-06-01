# Change Proposal: Import Large MegaMek Board Coordinates

## Summary

Support MegaMek `.board` hex labels whose column or row component exceeds two
digits, such as `10016` and `104120`, so large official or community boards can
feed tactical-map terrain, elevation, and cliff metadata instead of failing at
parse time.

## Motivation

The tactical map depends on imported board terrain/elevation data as the source
for movement and visibility projection. MegaMek saves ordinary small boards with
labels like `0101`, but large boards are serialized by concatenating the
1-indexed column and row with only sub-10 values zero-padded. Real MegaMek board
data therefore includes labels such as `10412`, `10016`, and `104120`.

MekStation previously required exactly four digits and rejected these large-board
labels, which blocked real imported terrain from reaching the same map
projection path.

## Source Anchors

- MegaMek `Coords.java:510-514`: `getBoardNum()` concatenates 1-indexed x/y and
  only zero-pads components below 10.
- MegaMek `Board.java:1062-1063`: board loading ignores the serialized label and
  assigns coordinates by board order, confirming the label is not fixed-width.
- MegaMek `data/boards/unofficial/Ashnods Maps/170x120 Fort David.board:2007`:
  real large-board cliff terrain uses `hex 10412 ...`.
- MegaMek `data/boards/unofficial/Ashnods Maps/170x120 Fort David.board:20367`:
  real large-board labels can have three-digit row components (`hex 104120 ...`).

## Scope

- Parse MegaMek board labels with two-or-more digit column and row components.
- Use declared board dimensions to disambiguate the column/row split.
- Preserve existing four-digit small-board parsing and invalid-coordinate errors.
- Add parser coverage for large-board labels and large-board cliff metadata.

## Non-Goals

- Change internal axial coordinate math.
- Parse all MegaMek terrain types not already supported by the board parser.
- Add a full corpus sweep over every MegaMek board file.
