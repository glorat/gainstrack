// tradeFx generation: the single-base FX rate tree. Ports PriceState.toGraph/Dijkstra,
// PositionSet.convertViaChain, and SingleFXConversion.generateFoo. Produces `AllState.tradeFx`.

import { InterpolationOption, isoToIntDate, linearInterpolateValue, SortedColumnMap } from 'src/lib/SortedColumnMap';
import { GPriceState } from 'src/lib/gen/priceState';

export interface TradeFxDTO {
  baseCcy: string;
  data: Record<string, { ks: string[]; vs: number[] }>;
}

// Linear interpolation over a price series (mirrors PriceFXConverter.getFX + linearDouble).
// Uses presence checks (not truthy) so a 0 rate isn't skipped.
function interpLinear(scm: SortedColumnMap, key: number): number | undefined {
  const n: InterpolationOption = scm.getNearest(key);
  if (n.empty) return undefined;
  if (n.exact !== undefined) return n.exact;
  if (n.low !== undefined) return n.low;
  if (n.high !== undefined) return n.high;
  if (n.interpolate) return linearInterpolateValue(n.interpolate, key);
  return undefined;
}

function getFX(ps: GPriceState, fx1: string, fx2: string, date: string): number | undefined {
  if (fx1 === fx2) return 1;
  const series = ps.sortedSeries(`${fx1}/${fx2}`);
  if (series.length === 0) return undefined;
  const scm = new SortedColumnMap(series.map(([d]) => isoToIntDate(d)), series.map(([, v]) => v.toNumber()));
  return interpLinear(scm, isoToIntDate(date));
}

// PositionSet.convertTo: convert every entry to tgt via getFX (unconverted if no rate).
function convertTo(pos: Map<string, number>, tgt: string, ps: GPriceState, date: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [c, v] of pos) {
    const fx = getFX(ps, c, tgt, date);
    if (fx !== undefined) out.set(tgt, (out.get(tgt) ?? 0) + fx * v);
    else out.set(c, (out.get(c) ?? 0) + v);
  }
  return out;
}

function convertViaChain(pos: Map<string, number>, tgtCcy: string, chain: string[], ps: GPriceState, date: string): Map<string, number> {
  if (chain.length === 0) throw new Error(`No ccyChain for ${tgtCcy}`);
  const h = chain[0];
  if (h === tgtCcy) return pos;
  if (chain.length === 1) return convertTo(pos, tgtCcy, ps, date);
  return convertViaChain(convertTo(pos, chain[1], ps, date), tgtCcy, chain.slice(1), ps, date);
}

// PriceState.toGraph: edge ccy -> fx2 with weight 1/(series length).
function toGraph(ps: GPriceState): Map<string, Array<[number, string]>> {
  const g = new Map<string, Array<[number, string]>>();
  for (const ccy of ps.ccys) {
    const edges: Array<[number, string]> = [];
    for (const [pair, series] of ps.prices) {
      const [fx1, fx2] = pair.split('/');
      if (fx1 === ccy) edges.push([1 / series.size, fx2]);
    }
    g.set(ccy, edges);
  }
  return g;
}

// Dijkstra.shortestPath — the exact fringe-sort recursion (returns src..dest, or [] if unreachable).
function shortestPath(graph: Map<string, Array<[number, string]>>, src: string, dest: string): string[] {
  let fringe: Array<[number, string[]]> = [[0, [src]]];
  let visited = new Set<string>();
  while (fringe.length > 0) {
    const [dist, path] = fringe[0];
    const rest = fringe.slice(1);
    const key = path[0];
    if (key === dest) return [...path].reverse();
    const newPaths: Array<[number, string[]]> = [];
    for (const [d, k] of graph.get(key) ?? []) {
      if (!visited.has(k)) newPaths.push([dist + d, [k, ...path]]);
    }
    fringe = [...newPaths, ...rest].sort((a, b) => a[0] - b[0]);
    visited = new Set(visited).add(key);
  }
  return [];
}

export function generateTradeFx(ps: GPriceState, base: string): TradeFxDTO {
  const graph = toGraph(ps);
  const data: Record<string, { ks: string[]; vs: number[] }> = {};

  for (const ccy of ps.ccys) {
    if (ccy === base) continue;

    const directPair = `${ccy}/${base}`;
    if (ps.prices.has(directPair)) {
      const series = ps.sortedSeries(directPair);
      data[ccy] = { ks: series.map(([d]) => d), vs: series.map(([, v]) => v.toNumber()) };
      continue;
    }

    const chain = shortestPath(graph, ccy, base);
    if (chain.length > 0 && chain[chain.length - 1] === base) {
      // Replicate Scala FIXME: dates come from the first pair in the chain only.
      const dates = ps.sortedSeries(`${chain[0]}/${chain[1]}`).map(([d]) => d);
      const vs = dates.map(dt => convertViaChain(new Map([[ccy, 1]]), base, chain, ps, dt).get(base) ?? 0);
      data[ccy] = { ks: dates, vs };
    }
    // else: unconvertible -> dropped
  }

  return { baseCcy: base, data };
}
