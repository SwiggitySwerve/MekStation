# Gate Runtime Conversion Actions

## Why

The tactical action dock now exposes represented LAM and QuadVee conversion
controls, but conversion is a MegaMek movement step with source-specific
legality and cost. Treating conversion as an unconditional state toggle lets the
map show a mode change that the source rules would reject, especially after a
movement preview, while prone, underwater, with damaged LAM gyro/actuators, or
when a damaged QuadVee cannot afford its conversion cost.

## What Changes

- Gate runtime conversion commands before dispatch using MegaMek-backed
  conversion action rules.
- Surface player-facing disabled reasons for conversion timing, prone and
  underwater state, LAM gyro/actuator damage, and QuadVee conversion MP cost.
- Carry represented conversion step count and MP cost in the replayable runtime
  movement-state event payload for auditability and later movement-step-chain
  integration.

## Out Of Scope

- Spending conversion MP inside the final movement declaration step chain.
- Representing bimodal LAM or spaceborne direct Mek/Fighter conversion.
- Representing QuadVee track-slot or conversion-equipment critical hits beyond
  currently modeled component damage.
