// Port of `com.gainstrack.report.AssetAllocation` plus the /api/aa/* handlers.
//
// Networth is split down a hierarchy of asset tags into a sunburst, and broken out per allocation
// as balance tree tables. Both work off data the browser already has: asset tags from
// `assetState`, positions from postings, and the store's FX converter.

import { LocalDate } from '@js-joda/core';
import { AccountCommandDTO, AccountDTO, AssetDTO, PostingEx, TreeTableDTO } from 'src/lib/assetdb/models';
import { SingleFXConverter } from 'src/lib/fx';
import { balanceTreeTable } from 'src/lib/TreeTable';
import { isSubAccountOf, positionSetFx, postingsToPositionSet } from 'src/lib/utils';

/** ccy -> units, the shape `postingsToPositionSet` produces (Scala `PositionSet`). */
export type Positions = Record<string, number>;

/** Tag hierarchy: one list of tags per sunburst level. Mirrors the server's configuration. */
export const DEFAULT_TAG_CONFIG: string[][] = [
  ['blend', 'property', 'cash'],
  ['equity', 'bond', 'commodity'],
  ['global', 'us', 'uk'],
];

/** Allocations broken out as tables, matching the server's /api/aa/table. */
export const DEFAULT_TABLE_ALLOCATIONS: string[][] = [['equity'], ['bond'], ['blend']];

/** The label the server gives the residual node at each level. */
const MORE = '...';

export interface SunburstDTO {
  ids: string[];
  parents: string[];
  values: number[];
  labels: string[];
}

export interface AllocationTable {
  name: string;
  rows: TreeTableDTO;
}

/** Assets carrying ANY of `tags` (Scala `AssetState.assetsForTags`). */
export function assetsForTags(assetState: AssetDTO[], tags: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const a of assetState) {
    const assetTags = (a.options?.tags ?? []) as string[];
    if (assetTags.some(t => tags.has(t))) out.add(a.asset);
  }
  return out;
}

function filterPositions(positions: Positions, assets: Set<string>): Positions {
  const out: Positions = {};
  for (const [ccy, units] of Object.entries(positions)) {
    if (assets.has(ccy)) out[ccy] = units;
  }
  return out;
}

function subtractPositions(a: Positions, b: Positions): Positions {
  const out: Positions = { ...a };
  for (const [ccy, units] of Object.entries(b)) {
    out[ccy] = (out[ccy] ?? 0) - units;
  }
  return out;
}

function addPositions(a: Positions, b: Positions): Positions {
  const out: Positions = { ...a };
  for (const [ccy, units] of Object.entries(b)) {
    out[ccy] = (out[ccy] ?? 0) + units;
  }
  return out;
}

interface Node {
  index: number;
  parent: number;
  level: number;
  position: Positions;
  label: string;
}

/**
 * Build the allocation node tree.
 *
 * Faithful to the Scala walk, including two behaviours that are easy to lose:
 *  - a level whose tags match nothing is SKIPPED rather than producing a residual node, and
 *  - a subtree that turns out to be all residual ("...") is discarded entirely, ids and all.
 * Node ids come from a shared counter, so creation order is part of the output.
 */
export function buildAllocationNodes(positions: Positions, tagConfig: string[][], assetState: AssetDTO[]): Node[] {
  let counter = 1;
  const root: Node = { index: counter, parent: 0, level: 0, position: positions, label: 'networth' };

  // Scala `PositionSet.isEmpty` is `values.forall(_.signum == 0)` — an all-zero position counts
  // as empty, so a tag whose assets net to nothing produces no node. Subtraction deliberately
  // keeps zeroed keys (it maps over the union), which is why this must test values, not keys.
  const isEmpty = (p: Positions) => Object.values(p).every(v => v === 0);

  function walk(current: Node): Node[] {
    if (current.level >= tagConfig.length) return [];

    const thisLevelNodes: Node[] = [];
    for (const tag of tagConfig[current.level]) {
      const assets = assetsForTags(assetState, new Set([tag]));
      const pos = filterPositions(current.position, assets);
      if (isEmpty(pos)) continue;
      counter += 1;
      thisLevelNodes.push({ index: counter, parent: current.index, level: current.level + 1, position: pos, label: tag });
    }

    if (thisLevelNodes.length === 0) {
      // No tag at this level applies; descend without inserting a level.
      return walk({ ...current, level: current.level + 1 });
    }

    // FIXME (inherited from the server): this overcounts if tags overlap.
    const accountedFor = thisLevelNodes.map(n => n.position).reduce(addPositions, {} as Positions);
    counter += 1;
    const remainder: Node = {
      index: counter, parent: current.index, level: current.level + 1,
      position: subtractPositions(current.position, accountedFor), label: MORE,
    };

    const ret: Node[] = [];
    for (const node of [...thisLevelNodes, remainder]) {
      ret.push(node, ...walk(node));
    }

    if (ret.every(n => n.label === MORE)) {
      counter -= ret.length; // reclaim the ids so numbering stays contiguous
      return [];
    }
    return ret;
  }

  return [root, ...walk(root)];
}

/** Sunburst payload for the allocation tree (Scala `AssetAllocation.toDTO`). */
export function allocationTree(
  positions: Positions, assetState: AssetDTO[], baseCcy: string, date: LocalDate,
  fx: SingleFXConverter, tagConfig: string[][] = DEFAULT_TAG_CONFIG,
): SunburstDTO {
  const nodes = buildAllocationNodes(positions, tagConfig, assetState);
  return {
    ids: nodes.map(n => String(n.index)),
    parents: nodes.map(n => (n.parent > 0 ? String(n.parent) : '')),
    values: nodes.map(n => positionSetFx(n.position, baseCcy, date, fx)),
    labels: nodes.map(n => n.label),
  };
}

/** Per-allocation balance tree tables (Scala /api/aa/table). */
export function allocationTables(
  accounts: AccountDTO[], postings: PostingEx[], assetState: AssetDTO[], baseCcy: string,
  date: LocalDate, fx: SingleFXConverter, allocations: string[][] = DEFAULT_TABLE_ALLOCATIONS,
): AllocationTable[] {
  return allocations.map(alloc => {
    const assets = assetsForTags(assetState, new Set(alloc));
    // The server filters accounts by their declared asset, not by their postings.
    const accountFilter = (a: AccountCommandDTO) => assets.has((a as unknown as AccountDTO).ccy);
    return {
      name: alloc.join('/'),
      rows: balanceTreeTable('Assets', date, baseCcy, 'global', accounts, postings, fx, accountFilter),
    };
  });
}

/** Networth positions: Assets plus Liabilities, the basis for the allocation split. */
export function networthPositions(postings: PostingEx[]): Positions {
  return postingsToPositionSet(
    postings.filter(p => isSubAccountOf(p.account, 'Assets') || isSubAccountOf(p.account, 'Liabilities')),
  );
}
