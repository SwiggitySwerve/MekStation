/**
 * Process-local registry of running replica sync clients (design D6).
 *
 * A consuming device needs somewhere to hold the connections it has
 * opened to sources, so opening the same replicated campaign twice does
 * not start a second dialler racing the first into the same stream.
 * Keyed by campaign AND grant, because one device can legitimately hold
 * two grants on the same campaign (a player grant and a GM grant, say)
 * and those are separate replica streams.
 *
 * Process-local on purpose: these are live sockets, not durable state.
 * The durable half is the replica journal, which is what a restart
 * resumes from - so losing this registry costs a reconnect, never data.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { CampaignReplicaSyncClient } from './CampaignReplicaSyncClient';

const running = new Map<string, CampaignReplicaSyncClient>();

/** Registry key: one live dialler per campaign+grant pair. */
function keyFor(campaignId: string, grantId: string): string {
  return JSON.stringify([campaignId, grantId]);
}

/** The client already dialling for this pair, if any. */
export function getReplicaSyncClient(
  campaignId: string,
  grantId: string,
): CampaignReplicaSyncClient | null {
  return running.get(keyFor(campaignId, grantId)) ?? null;
}

/**
 * Registers a client as the one for this pair. Refuses to displace a
 * live client: two diallers on one stream would race each other into
 * the same journal and produce gaps or collisions that look like source
 * faults rather than a local mistake.
 */
export function registerReplicaSyncClient(
  campaignId: string,
  grantId: string,
  client: CampaignReplicaSyncClient,
): { readonly kind: 'registered' | 'already-running' } {
  const key = keyFor(campaignId, grantId);
  const existing = running.get(key);
  if (existing && existing.status() !== 'disconnected') {
    return { kind: 'already-running' };
  }
  running.set(key, client);
  return { kind: 'registered' };
}

/** Stops and forgets the client for this pair, if one is running. */
export function stopReplicaSyncClient(
  campaignId: string,
  grantId: string,
): boolean {
  const key = keyFor(campaignId, grantId);
  const existing = running.get(key);
  if (!existing) return false;
  existing.disconnect();
  running.delete(key);
  return true;
}

/** Test seam: drop every registration without touching durable state. */
export function resetReplicaSyncRegistryForTests(): void {
  // Array.from rather than iterating the MapIterator directly: the
  // build target does not enable downlevel iteration.
  for (const client of Array.from(running.values())) client.disconnect();
  running.clear();
}
