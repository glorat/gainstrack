import {sortBy, sum} from 'lodash';

export interface ContributionCalculatorInput {
  assetId: string
  value: number
  units: number
  price: number
  target: number
}
export interface ContributionCalculatorEntries extends ContributionCalculatorInput {
  targetValue: number
  deviation: number
}

export class ContributionCalculator {
  entries:ContributionCalculatorEntries[]
  total: number

  // Isn't total just sum of all assets with some currency?
  constructor(networthByAsset: ContributionCalculatorInput[], readonly baseCcy: string) {
    const total = sum(networthByAsset.map(a => a.value))
    this.total = total;
    this.entries = networthByAsset.map(row => {
      const ratio = row.value/total
      // Beware the target conversion from % to ratio
      return {...row, target: row.target/100, targetValue: row.value, deviation: 0}
    })
    this.updateDeviation() // for sorting
  }

  /** Updates entries.totalValue with additional contrib */
  contribute(contrib: number) {
    // assert contrib > 0
    this.total += contrib
    this.updateDeviation()

    for (let i=0; i<this.entries.length-1; i++) {
      const toAdjust = this.entries.slice(0,i+1);
      const currentDev = this.entries[i].deviation
      const targetDev = this.entries[i+1].deviation
      const deltaRatio = targetDev - currentDev
      const maxMovement = sum(toAdjust.map(e => (e.target*targetDev*this.total)-e.targetValue ))
      if (maxMovement+this.currentTotal() >= this.total) {
        // Final adjustment
        const toAllocate = (this.total-this.currentTotal())

        const totalAdjRatio = sum(toAdjust.map(e => e.target))
        toAdjust.forEach(e => {
          e.targetValue += (e.target/totalAdjRatio)*toAllocate
        })
        // Now break and return
        this.updateDeviation()
        return this.entries.map(e => e.targetValue)
      } else {
        // Perform max adjustment and iterate
        for (let j=0; j<=i; j++) {
          this.entries[j].targetValue = (this.entries[j].target*targetDev*this.total)
        }
        this.updateDeviation()
      }
    }
    // If we naturally left the loop, everything needs to move
    this.entries.forEach(e => {
      e.targetValue = this.total * e.target
    })
    this.updateDeviation()

    return this.entries.map(e => e.targetValue)
  }

  currentTotal():number {
    return sum(this.entries.map(e => e.targetValue))
  }

  updateDeviation() {
    this.entries.forEach(e => {
      e.deviation = (e.targetValue / this.total)/e.target
      // => e.target*dev*total = e.targetValue
    })
    this.entries = sortBy(this.entries, e => e.deviation)
    // console.log('Deviations:')
    // this.entries.forEach(e => console.log(`${e.assetId}\t${e.deviation}`))
  }

}
