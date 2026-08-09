import { AssetDTO } from 'src/lib/assetdb/models';
import { assetsForTags, buildAllocationNodes, networthPositions } from 'src/lib/assetAllocation';

const asset = (a: string, tags: string[]): AssetDTO =>
  ({ asset: a, options: { name: '', ticker: '', tags } } as unknown as AssetDTO);

const ASSETS = [
  asset('VWRL', ['equity', 'global']),
  asset('GILT', ['bond', 'uk']),
  asset('HOUSE', ['property']),
  asset('USD', []),
];

const TAGS = [['blend', 'property', 'cash'], ['equity', 'bond', 'commodity'], ['global', 'us', 'uk']];

describe('assetsForTags', () => {
  test('matches an asset carrying ANY of the tags', () => {
    expect(assetsForTags(ASSETS, new Set(['equity']))).toEqual(new Set(['VWRL']));
    expect(assetsForTags(ASSETS, new Set(['equity', 'bond']))).toEqual(new Set(['VWRL', 'GILT']));
  });

  test('an untagged asset belongs to nothing', () => {
    expect(assetsForTags(ASSETS, new Set(['equity', 'bond', 'property']))).not.toContain('USD');
  });
});

describe('buildAllocationNodes', () => {
  test('the root is always present and is the whole position', () => {
    const [root] = buildAllocationNodes({ VWRL: 10 }, TAGS, ASSETS);
    expect(root).toMatchObject({ index: 1, parent: 0, level: 0, label: 'networth' });
    expect(root.position).toEqual({ VWRL: 10 });
  });

  test('a level whose tags match nothing is skipped, not given a residual node', () => {
    // VWRL is equity/global: nothing at level 0 (blend/property/cash) applies, so the walk
    // descends a level rather than emitting a "..." node for the whole balance.
    const nodes = buildAllocationNodes({ VWRL: 10 }, TAGS, ASSETS);
    expect(nodes.map(n => n.label)).toContain('equity');
    expect(nodes.find(n => n.label === 'equity')?.parent).toBe(1);
  });

  test('residual balance lands in a "..." node alongside matched tags', () => {
    const nodes = buildAllocationNodes({ HOUSE: 100, USD: 50 }, TAGS, ASSETS);
    const labels = nodes.map(n => n.label);
    expect(labels).toContain('property');
    expect(labels).toContain('...');
    // USD carries no tags, so it is the residual. Subtraction keeps the zeroed HOUSE key,
    // matching Scala's PositionSet, which maps over the union rather than pruning.
    expect(nodes.find(n => n.label === '...')?.position).toEqual({ HOUSE: 0, USD: 50 });
  });

  test('an all-residual subtree is discarded entirely', () => {
    // Nothing is tagged at any level, so every child would be "..." — the server drops them.
    const untagged = [asset('USD', [])];
    const nodes = buildAllocationNodes({ USD: 50 }, TAGS, untagged);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe('networth');
  });

  test('node ids are contiguous from 1 so sunburst parents resolve', () => {
    const nodes = buildAllocationNodes({ VWRL: 10, GILT: 20, HOUSE: 100, USD: 5 }, TAGS, ASSETS);
    const ids = nodes.map(n => n.index).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: nodes.length }, (_, i) => i + 1));
    // Every non-root parent must exist, or plotly renders an empty chart.
    const known = new Set(ids);
    for (const n of nodes) if (n.parent > 0) expect(known.has(n.parent)).toBe(true);
  });

  test('nests to the configured depth', () => {
    const nodes = buildAllocationNodes({ VWRL: 10 }, TAGS, ASSETS);
    expect(nodes.map(n => n.label)).toContain('global');
    expect(Math.max(...nodes.map(n => n.level))).toBeLessThanOrEqual(TAGS.length);
  });
});

describe('zero balances', () => {
  test('a tag whose assets net to zero produces no node (PositionSet.isEmpty is all-zero)', () => {
    const nodes = buildAllocationNodes({ HOUSE: 0, VWRL: 10 }, TAGS, ASSETS);
    expect(nodes.map(n => n.label)).not.toContain('property');
    expect(nodes.map(n => n.label)).toContain('equity');
  });
});

describe('networthPositions', () => {
  test('includes Assets and Liabilities only', () => {
    const postings = [
      { account: 'Assets:Bank', value: { number: 100, ccy: 'USD' }, date: '2019-01-01', originIndex: 0 },
      { account: 'Liabilities:Card', value: { number: -30, ccy: 'USD' }, date: '2019-01-01', originIndex: 0 },
      { account: 'Income:Salary', value: { number: -500, ccy: 'USD' }, date: '2019-01-01', originIndex: 0 },
    ];
    expect(networthPositions(postings)).toEqual({ USD: 70 });
  });
});
