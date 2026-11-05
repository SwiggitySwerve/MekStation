# Tripod MTF locations

The MTF converter retains the center leg as `CENTER_LEG` in critical slots,
equipment locations and armor allocation. `Center Leg` and `CL` identify that
location. It has six slots, padded or truncated like the other legs. A center-leg
section must not append its criticals to the preceding location.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `TripodMek.java:63-68` defines the ninth location and its six critical slots.
- `MtfFile.java:776-782,816-825` selects each location and retains its criticals.
- `BVCalculator.java:527-543` includes A-Pods as defensive equipment. Losing
  center-leg criticals loses two A-Pods on the pinned Ares variants.

Location spelling belongs to `enum_mapping_tables.py`; section recognition
belongs to `mtf_parser.py`; serialized slot shape and armor allocation belong
to `mtf_parser_builders.py`. The BV scanner consumes the converted grid without
inventing absent mounts. Tests exercise the converter's public parse contract.
