import {sortBy, sum} from 'lodash';
import {formatNumber, formatPerc} from 'src/lib/utils';

export interface ContributionCalculatorInput {
  assetId: string
  value: number
  target: number
  units?: number
  price?: number

}
export interface ContributionCalculatorEntries extends ContributionCalculatorInput {
  targetValue: number
  deviation: number
}

export class ContributionCalculator {
  entries:ContributionCalculatorEntries[];
  private originalTotal:number;
  private targetTotal: number;
  private contrib = 0;

  // Isn't total just sum of all assets with some currency?
  constructor(networthByAsset: ContributionCalculatorInput[], readonly baseCcy: string) {
    const total = sum(networthByAsset.map(a => a.value));
    this.originalTotal = total;
    this.targetTotal = total;
    this.entries = networthByAsset.map(row => {
      // Beware the target conversion from % to ratio
      return {...row, target: row.target/100, targetValue: row.value, deviation: 0}
    });
    this.updateDeviation() // for sorting
  }

  get total(): number {
    return this.targetTotal;
  }

  /** Updates entries.totalValue with additional contrib */
  contribute(contrib: number) {
    // assert contrib > 0
    this.contrib = contrib;
    this.targetTotal += contrib;
    this.updateDeviation();

    for (let i=0; i<this.entries.length-1; i++) {
      const toAdjust = this.entries.slice(0,i+1);
      // const currentDev = this.entries[i].deviation
      const targetDev = this.entries[i+1].deviation;
      const maxMovement = sum(toAdjust.map(e => (e.target*targetDev*this.targetTotal)-e.targetValue ));
      if (maxMovement+this.currentTotal() >= this.targetTotal) {
        // Final adjustment
        const toAllocate = (this.targetTotal-this.currentTotal());

        const totalAdjRatio = sum(toAdjust.map(e => e.target));
        toAdjust.forEach(e => {
          e.targetValue += (e.target/totalAdjRatio)*toAllocate
        });
        // Now break and return
        this.updateDeviation();
        return this.entries.map(e => e.targetValue)
      } else {
        // Perform max adjustment and iterate
        for (let j=0; j<=i; j++) {
          this.entries[j].targetValue = (this.entries[j].target*targetDev*this.targetTotal)
        }
        this.updateDeviation()
      }
    }
    // If we naturally left the loop, everything needs to move
    this.entries.forEach(e => {
      e.targetValue = this.targetTotal * e.target
    });
    this.updateDeviation();

    return this.entries.map(e => e.targetValue)
  }

  currentTotal():number {
    return sum(this.entries.map(e => e.targetValue))
  }

  updateDeviation() {
    this.entries.forEach(e => {
      e.deviation = (e.targetValue / this.targetTotal)/e.target
      // => e.target*dev*total = e.targetValue
    });
    this.entries = sortBy(this.entries, e => e.deviation)
    // console.log('Deviations:')
    // this.entries.forEach(e => console.log(`${e.assetId}\t${e.deviation}`))
  }

  makeSankeyData() {
    const label:string[] = [];
    const color:string[] = [];
    const customdata: string[] = [];
    this.entries.forEach(entry => {
      label.push(`${entry.assetId} ${formatPerc(entry.value/this.originalTotal)}`);
      color.push('red');
      customdata.push(`${formatNumber(entry.value)} ${this.baseCcy}`)
    });
    this.entries.forEach(entry => {
      label.push(`${entry.assetId} ${formatPerc(entry.targetValue/this.targetTotal)}`);
      color.push('green');
      customdata.push(`${formatNumber(entry.targetValue)} ${this.baseCcy}`)
    });
    label.push(this.baseCcy);
    color.push('purple');
    customdata.push(`${this.contrib} ${this.baseCcy}`);
    const hovertemplate = '%{label}<br>%{customdata}';
    const node = {label, color, hovertemplate, customdata};
    const link = this.makeSankeyLinks();
    const data = {type: 'sankey', node, link};
    return data;
  }

  private makeSankeyLinks() {
    const n = this.entries.length;

    const source:number[] = [];
    const target:number[] = [];
    const value:number[] = [];
    const label:string[] = [];
    const contribIdx = n*2;
    this.entries.forEach((entry, idx) => {
      source.push(idx);
      target.push(n+idx);
      value.push(entry.value);
      label.push(`${entry.units} ${entry.assetId}`);
      if (entry.value !== entry.targetValue) {
        source.push(contribIdx);
        target.push(n+idx);
        value.push(entry.targetValue - entry.value);
        label.push(`BUY ${formatNumber(entry.targetValue - entry.value)} ${this.baseCcy} of ${entry.assetId}`);
      }
    });
    const link = {source, target, value, label};
    return link;
  }

}
