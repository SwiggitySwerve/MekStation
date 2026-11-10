'use strict';
/**
 * The round-trip comparison, ported from C3's v2 census (census.cjs) with the same meaning. Pure
 * given the loaded product modules: it takes what the capture already holds (the committed source
 * unit, the loader's notice residual and mounts before the save, and the reopened state) and
 * returns the reopen-block fields of a schema row. It does no observation and no BV math.
 *
 *   cells      source cells with nothing at the same (location, slot) after reopen
 *   identity   `system` = exact-identity match against MTFVocabulary's system set, never a substring
 *   bucket     recovery owner of a non-system cell or a mount, from the notice classifiers
 *   notice     the loader's unrecoveredCriticalSlots residual vs the non-system lost cells (exact triples)
 *   mounts     lost / changed / added loaded mounts, with the cells each owns
 * Requires the Jest module environment (it loads product code through the `@/` alias).
 */
const assert = require('node:assert/strict');

// Sorted keys, undefined dropped: the scratch harnesses' canonical(), used here only for equality.
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
};
const json = (value) => JSON.stringify(canonical(value));

function createRoundTripDiff() {
  const { mapMechLocation } = require('@/services/units/unitLoaderService/componentMappers');
  const { getSlotParts } = require('@/utils/construction/slotOperations/parts');
  const { isMTFCriticalSlotSystemName: isSystem } = require('@/services/conversion/MTFVocabulary');
  const { parseCriticalSlotToken } = require('@/services/units/unitLoaderService/equipmentResolution');
  const {
    CriticalSlotRecoveryResponsibility,
    classifyCriticalSlotNoticeIdentity,
  } = require('@/services/units/unitLoaderService/criticalSlotNoticeEffects');
  const { classifyCriticalSlotNoticeEntry } = require('@/services/units/unitLoaderService/criticalSlotNoticeGroups');

  const bucketNames = [...new Set(Object.values(CriticalSlotRecoveryResponsibility)), 'none'];
  // The schema's OWNER_BUCKETS must be exactly what the classifier can say.
  assert.deepEqual([...bucketNames].sort(), ['o3a', 'o3b', 'o3b-s', 'Celerity', 'PR-D', 'none'].sort());

  const location = (name) => mapMechLocation(name) || name;
  const cellKey = (loc, slot) => json([location(loc), slot]);
  const assigned = (result) => ({
    bucket: bucketNames.includes(result.effect.responsibility) ? result.effect.responsibility : 'none',
    kind: String(result.kind),
  });
  const classifyCell = (entry, source) =>
    assigned(
      classifyCriticalSlotNoticeEntry(
        { text: entry.token ?? entry.text, location: location(entry.location), slot: entry.slot },
        source,
      ),
    );
  const cellsOf = (definition) =>
    Object.entries(definition.criticalSlots || {}).flatMap(([loc, slots]) =>
      slots.flatMap((token, slot) =>
        typeof token === 'string' && token.trim() ? [{ location: location(loc), slot, token }] : [],
      ),
    );
  const mountView = (item) =>
    canonical({
      equipmentId: item.equipmentId,
      category: item.category,
      techBase: item.techBase,
      location: item.location,
      slots: item.slots,
      splitSlots: item.splitSlots,
      spreadSlots: item.spreadSlots,
      isRearMounted: item.isRearMounted,
      isOmniPodMounted: item.isOmniPodMounted,
      weight: item.weight,
      criticalSlots: item.criticalSlots,
      heat: item.heat,
    });
  const mountCells = (item) =>
    [...getSlotParts(item)].flatMap((part) => part.slots.map((slot) => ({ location: part.location, slot })));
  const mountOwner = (item) => ({
    ...assigned(
      classifyCriticalSlotNoticeIdentity({
        lookupToken: item.name || item.equipmentId,
        equipmentId: item.equipmentId,
        equipmentName: item.name,
        equipmentCategory: item.category,
      }),
    ),
    equipmentCategory: item.category || null,
  });

  /** Loaded mounts present after reopen unchanged; changed under the same identity; lost; added. */
  function matchMounts(before, after) {
    const available = after.map((item, index) => ({ item, index }));
    const lost = [];
    const changed = [];
    for (const item of before) {
      let at = available.findIndex((v) => json(mountView(v.item)) === json(mountView(item)));
      if (at >= 0) {
        available.splice(at, 1);
        continue;
      }
      at = available.findIndex(
        (v) => v.item.equipmentId === item.equipmentId && v.item.category === item.category && v.item.techBase === item.techBase,
      );
      if (at >= 0) {
        changed.push({
          before: mountView(item),
          after: mountView(available[at].item),
          cells: mountCells(available[at].item),
          ...mountOwner(item),
        });
        available.splice(at, 1);
      } else lost.push({ ...mountView(item), ...mountOwner(item) });
    }
    return { lost, changed, added: available.map((v) => ({ ...mountView(v.item), cells: mountCells(v.item) })) };
  }

  /**
   * source: the committed unit JSON. noticeBefore: the loader's unrecoveredCriticalSlots before the
   * save. equipmentBefore: the loaded mounts. reopened: the reopened unit state.
   */
  return function compareRoundTrip({ source, noticeBefore, equipmentBefore, reopened }) {
    const reopenedSource = reopened.bvContext?.source;
    assert(reopenedSource, 'Missing reopened source');
    const afterCells = new Map(cellsOf(reopenedSource).map((c) => [cellKey(c.location, c.slot), c]));
    const lostCells = [];
    const tokenChanges = [];
    const triple = (c) => ({ location: c.location, slot: c.slot, text: c.token ?? c.text });
    for (const cell of cellsOf(source)) {
      const afterCell = afterCells.get(cellKey(cell.location, cell.slot));
      if (!afterCell) {
        if (isSystem(parseCriticalSlotToken(cell.token).lookupToken))
          lostCells.push({ ...triple(cell), identity: 'system', bucket: null, kind: null });
        else lostCells.push({ ...triple(cell), identity: 'non-system', ...classifyCell(cell, source) });
      } else if (afterCell.token !== cell.token) tokenChanges.push({ ...triple(cell), reopenedText: afterCell.token });
    }
    // Unfiltered: every lost cell (system or not) and every rewritten cell, as plain triples.
    const rawIdentityLosses = [...lostCells.map(triple), ...tokenChanges.map(({ reopenedText, ...cell }) => cell)];

    const residual = noticeBefore.map((e) => ({ location: e.location, slot: e.slot, text: e.text }));
    const exact = (c) => json([c.location, c.slot, c.text]);
    const nonSystem = lostCells.filter((c) => c.identity === 'non-system').map(triple);
    const actual = new Set(nonSystem.map(exact));
    const notice = new Set(residual.map(exact));
    const noticeOnly = residual.filter((c) => !actual.has(exact(c)));
    const roundTripOnly = nonSystem.filter((c) => !notice.has(exact(c)));
    const mounts = matchMounts(equipmentBefore, reopened.equipment);
    return {
      lostCells,
      tokenChanges,
      rawIdentityLosses,
      noticeResidual: {
        residual,
        noticeOnly,
        roundTripOnly,
        equal: noticeOnly.length === 0 && roundTripOnly.length === 0,
        reopenedResidualCells: (reopened.unrecoveredCriticalSlots || []).length,
      },
      loadedMountLosses: mounts.lost,
      changedLoadedMounts: mounts.changed,
      addedLoadedMounts: mounts.added,
    };
  };
}

module.exports = { createRoundTripDiff };
