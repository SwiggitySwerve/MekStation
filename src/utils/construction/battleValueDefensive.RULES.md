# Defensive BV rules

battleValueDefensive.ts owns the undamaged modular-armor BV point rule and
canonical normalized ID. Each construction mount adds ten points before armor
multipliers and BAR. Mech callers retain their positive-slot guard; vehicle
callers retain raw-ID normalization and physical-location filtering.
The critical scanner retains its separate raw-critical spelling projection.
Source: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
MiscType.java:2524-2543 and BVCalculator.java:385-408,425-436.
