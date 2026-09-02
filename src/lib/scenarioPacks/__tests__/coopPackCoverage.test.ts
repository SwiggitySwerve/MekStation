/**
 * The co-op lifecycle surfaces need a pack before they can be swept
 * (umbrella 19.4, finding #32).
 *
 * `CampaignCoopRouteSurface` renders `null` unless the campaign carries a
 * `coopSession`, so `host-gm-review-surface`, `guest-proposal-surface`
 * and `campaign-sync-state` are unreachable on every route the layout
 * sweep visits. The campaign-detail route IS swept, which is what makes
 * the gap invisible: the route passes while every surface the lifecycle
 * work built goes unexercised.
 *
 * This guard is deliberately a JEST test reading the pack payloads off
 * disk, not a Playwright spec. The Playwright suites need a dev server
 * this worktree cannot start, so a red-first proof written there could
 * not be watched failing before the fix - and an unwatched red is not a
 * red.
 *
 * Reading the JSON off disk is NOT, however, enough on its own - that
 * belief is what let two wiring mutants through, and the second describe
 * block below exists because of it. Disk rows prove the fixtures exist;
 * manifest rows prove the sweep will actually load them.
 *
 * TWO packs are required, not one. `coopSession.mode` is a single value
 * per campaign, and the surfaces split on it: `host` mounts the GM
 * review surface on the campaign dashboard, `guest` mounts the proposal
 * surface on the mutation sub-routes and the sync banner with it. One
 * campaign cannot be both, so one pack cannot cover both surfaces.
 *
 * THE TWO CO-OP PACKS ARE HAND-AUTHORED, and that is a deliberate
 * exception worth stating where someone will find it. Neither sanctioned
 * minter can produce them: the flow-checkpoint minter captures a live GET
 * against a registered flow and `e2e/flows/manifest.ts` registers no
 * co-op flow, while the fast-forward minter dumps a headless
 * `fastForwardCampaign()` day-advance run, which never opens a co-op
 * session. Their STRUCTURE is derived from the sanctioned
 * navigation-briefing payload; their identity and co-op fields are
 * authored; their provenance is written fresh in the manifest and names
 * this change rather than borrowing another pack's genesis. The rows
 * below check the authored fields specifically, because a hand-authored
 * fixture has no minter to have already validated it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SCENARIO_PACK_MANIFEST } from '../../../../e2e/scenario-packs/manifest';

const PACKS_ROOT = join(process.cwd(), 'e2e', 'scenario-packs');
const PACK_DIR = join(PACKS_ROOT, 'campaign');

/** The two co-op entries, by manifest id and the mode each must seed. */
const COOP_ENTRIES = [
  ['coop-host-review', 'host'],
  ['coop-guest-proposal', 'guest'],
] as const;

interface PackPayload {
  readonly campaignId?: string;
  readonly originDeviceId?: string;
  readonly body?: {
    readonly id?: string;
    readonly coopSession?: {
      readonly mode?: string;
      readonly matchId?: string;
    };
  };
}

/** Every campaign pack payload on disk, by file name. */
function readCampaignPacks(): ReadonlyArray<readonly [string, PackPayload]> {
  return readdirSync(PACK_DIR)
    .filter((name) => name.endsWith('.campaign.json'))
    .map(
      (name) =>
        [
          name,
          JSON.parse(
            readFileSync(join(PACK_DIR, name), 'utf-8'),
          ) as PackPayload,
        ] as const,
    );
}

/** Pack file names whose payload seeds a co-op session in the given mode. */
function packsSeeding(mode: 'host' | 'guest'): readonly string[] {
  return readCampaignPacks()
    .filter(([, payload]) => payload.body?.coopSession?.mode === mode)
    .map(([name]) => name);
}

describe('co-op scenario pack coverage', () => {
  it('finds campaign packs on disk at all', () => {
    // Guards the guard: if the directory moved, the two rows below would
    // report "no co-op pack" for the wrong reason and a later fix would
    // look like it worked.
    expect(readCampaignPacks().length).toBeGreaterThan(0);
  });

  it('registers a pack seeding a HOST co-op session', () => {
    // Without one, `host-gm-review-surface` never mounts on any swept
    // route and its lifecycle postures cannot be checked by the sweep.
    expect(packsSeeding('host')).not.toHaveLength(0);
  });

  it('registers a pack seeding a GUEST co-op session', () => {
    // Without one, `guest-proposal-surface` and the `campaign-sync-state`
    // banner it carries never mount on any swept route.
    expect(packsSeeding('guest')).not.toHaveLength(0);
  });

  it('keeps the two modes in separate packs', () => {
    // The failure this catches is someone "simplifying" the two packs
    // into one by flipping a mode, which would silently drop whichever
    // surface lost its seed while both rows above still passed.
    const host = packsSeeding('host');
    const guest = packsSeeding('guest');

    expect(host.some((name) => guest.includes(name))).toBe(false);
  });

  it.each(['host', 'guest'] as const)(
    'gives the %s pack the identity fields a mint would have stamped',
    (mode) => {
      // Hand-authored, so nothing upstream has already validated these. A
      // pack that inherited the base fixture's campaign id would collide
      // with navigation-briefing the moment both are loaded.
      const [name] = packsSeeding(mode);
      const entry = readCampaignPacks().find(([file]) => file === name);
      const payload = entry?.[1];

      expect(payload?.campaignId).toContain('coop');
      expect(payload?.body?.id).toBe(payload?.campaignId);
      expect(payload?.body?.coopSession?.matchId).toBeTruthy();
      // Never the base fixture's origin device - that field is a claim
      // about where the payload came from.
      expect(payload?.originDeviceId).not.toBe(
        '2c7a9cf3-78fc-416e-953e-3d2b2c8f3128',
      );
    },
  );
});

/**
 * The rows above read the pack files straight off disk, which proves the
 * FILES exist and says nothing about whether the MANIFEST wires them - and
 * the manifest is what the sweep actually loads. Two mutants walked
 * through that gap untouched: pointing the guest entry's `payloadPath` at
 * the HOST payload, and changing the guest entry's `pins.schemaVersion` to
 * a value the payload does not carry. Both left the whole jest tree green,
 * and only the Playwright manifest guard - which cannot run in this
 * worktree - would ever have caught them. A guest entry seeding the host
 * payload would have swept the wrong surface while reporting success.
 *
 * So these rows resolve each co-op entry THROUGH the manifest: they load
 * the payload the entry actually points at, and check it is the one the
 * entry claims. That is the difference between "the fixture exists" and
 * "the fixture is wired to the thing that will load it".
 */
describe('co-op manifest wiring', () => {
  /** The manifest entry for a co-op pack id, or undefined. */
  function entryFor(id: string) {
    return SCENARIO_PACK_MANIFEST.find((candidate) => candidate.id === id);
  }

  /** Loads the payload an entry's `payloadPath` actually resolves to. */
  function payloadAt(payloadPath: string): PackPayload & {
    readonly schemaVersion?: number;
  } {
    return JSON.parse(readFileSync(join(PACKS_ROOT, payloadPath), 'utf-8'));
  }

  it.each(COOP_ENTRIES)('registers %s in the manifest', (id) => {
    expect(entryFor(id)).toBeDefined();
  });

  it.each(COOP_ENTRIES)(
    'points %s at a payload seeding the %s mode it claims',
    (id, mode) => {
      // The mutant this kills: a `payloadPath` copy-paste that leaves the
      // guest entry loading the host campaign. Both files exist, both
      // carry a coopSession, and every disk-level row above stays green -
      // but the sweep mounts the wrong surface and passes.
      const entry = entryFor(id);
      const payload = payloadAt(entry?.payloadPath ?? '');

      expect(payload.body?.coopSession?.mode).toBe(mode);
    },
  );

  it.each(COOP_ENTRIES)(
    'pins %s to the schemaVersion its payload actually carries',
    (id) => {
      // `loadCampaignPack` hard-fails on a pin mismatch at sweep time.
      // Catching it here turns a red sweep into a red unit run.
      const entry = entryFor(id);
      const payload = payloadAt(entry?.payloadPath ?? '');
      const pins = entry?.pins as { schemaVersion?: number } | undefined;

      expect(pins?.schemaVersion).toBe(payload.schemaVersion);
    },
  );

  it('gives the two entries distinct payloads', () => {
    // Belt and braces for the copy-paste above: even if both modes somehow
    // matched, two entries sharing one payload file is a wiring error.
    const paths = COOP_ENTRIES.map(([id]) => entryFor(id)?.payloadPath);

    expect(new Set(paths).size).toBe(COOP_ENTRIES.length);
  });
});
