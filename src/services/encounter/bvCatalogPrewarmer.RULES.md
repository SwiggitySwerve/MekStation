# BV prewarmer

The prewarmer reads the report and computes uncovered entries on each call.
It neither reads nor writes derived disk caches: index version/count do not
identify calculator logic or fresh source facts. Malformed units still fail
through the shared BV owner (BVCalculator.java:103-139, pin 48fcb2f64).
