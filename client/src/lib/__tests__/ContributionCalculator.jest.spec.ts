import {ContributionCalculator, ContributionCalculatorInput} from 'src/lib/ContributionCalculator';

describe('BalanceCalculator', () => {

  const data: ContributionCalculatorInput[] = [
    {assetId: 'BOND', value: 16500, target: 20, price :1, units: 16500},
    {assetId: 'TIPS', value: 6500, target: 10, price: 1, units: 6500},
    {assetId: 'FTSE', value: 43500, target: 40, price: 68.75, units: 43500/68.75},
    {assetId: 'VWRD', value: 33500, target: 30, price: 48.80, units: 33500/48.80}
  ]

  test('Construction', () => {
    const calc = new ContributionCalculator(data, 'USD')
    expect(calc.total).toEqual(100000)
  })

  test('correct demo case', () => {
    const calc = new ContributionCalculator(data, 'USD')
    const ret = calc.contribute(5000)
    expect(calc.total).toEqual(105000)
    expect(ret[0]).toBeCloseTo(9333, 0)
    expect(ret[1]).toBeCloseTo(18667, 0)

    expect(calc.entries[0].targetValue).toBeCloseTo(9333, 0)
  })

  test('correct edge case', () => {
    const calc = new ContributionCalculator(data, 'USD')
    const ret = calc.contribute(1750)
    expect(calc.total).toEqual(101750)
    expect(ret[0]).toBeCloseTo(6500+1750, 0)
    expect(ret[1]).toBeCloseTo(16500, 0)
  })

  test('correct high case', () => {
    const calc = new ContributionCalculator(data, 'USD')
    const ret = calc.contribute(100000)
    expect(calc.total).toEqual(200000)
    expect(ret[0]).toBeCloseTo(20000, 0)
    expect(ret[1]).toBeCloseTo(40000, 0)
  })

});
