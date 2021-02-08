import {AccountCommandDTO, AccountDTO, AllState, isTransaction, Posting, PostingEx, Transaction} from './assetdb/models';
import {flatten} from 'lodash';
import {SingleFXConversion} from '../lib/fx';

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

  underlyingCcy(assetId: string, accountId: string|undefined): string|undefined {
    const cmds = this.state.commands;
    const unitFilter = (cmd:AccountCommandDTO) => cmd.commandType === 'unit' && cmd.balance?.ccy === assetId;
    const tradeFilter = (cmd:AccountCommandDTO) => cmd.commandType === 'trade' && cmd.change?.ccy === assetId;
    const acctFilter = (cmd:AccountCommandDTO) => cmd.accountId === accountId;
    const reversed = [...cmds].reverse(); // Don't mutate!
    let prev = reversed.find(cmd => acctFilter(cmd) && (unitFilter(cmd) || tradeFilter(cmd)));
    if (!prev) prev = reversed.find(cmd => (unitFilter(cmd) || tradeFilter(cmd)));
    if (prev && prev.commandType === 'unit') return prev.price?.ccy;
    if (prev && prev.commandType === 'trade') return prev.price?.ccy;
    return undefined;
  }

  findAccount(accountId: string|undefined) {
    const all: AccountDTO[] = this.state.accounts;
    const acct = all.find(x => x.accountId === accountId);
    return acct
  }
}
