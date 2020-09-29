import {AllState, isTransaction, Posting, PostingEx, Transaction} from 'src/lib/models';
import {flatten} from 'lodash';
import {SingleFXConversion} from 'src/lib/fx';

export class AllStateEx {

  constructor(readonly state: AllState) {
  }

  allTxs() {
    return this.state.txs.filter(isTransaction);
  }

  allPostings() {
    const allTxPostings : Posting[][] = this.state.txs.map(tx => isTransaction(tx) ?  tx.postings : []);
    const allPostings = flatten(allTxPostings);
    return allPostings;
  }

  allPostingsEx() {
    const ret:PostingEx[] = [];
    const allTxs: Transaction[] = this.allTxs();
    allTxs.forEach(tx => {
      tx.postings.forEach(p => {
        ret.push({...p, date: tx.postDate, originIndex: tx.originIndex})
      });
    });
    return ret;
  }

  tradeFxConverter() {
    const tradeFxData: { baseCcy: string; data: Record<string, { ks: string[]; vs: number[] }> } | undefined = this.state.tradeFx;
    return SingleFXConversion.fromDTO(tradeFxData.data, tradeFxData.baseCcy)
  }
}
