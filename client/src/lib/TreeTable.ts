import {AccountCommandDTO, AccountDTO, PostingEx, TreeTableDTO} from '../lib/models';
import { LocalDate } from '@js-joda/core';
import {SingleFXConverter} from '../lib/fx';
import {
  convertedPositionSet,
  isSubAccountOf,
  parentAccountIdOf,
  postingsToPositionSet
} from '../lib/utils';

function shortAccountId(accountId: string) {
  const bits = accountId.split(':')
  return bits.length ? bits[bits.length-1] : '';
}

export function balanceTreeTable(topAccountId: string, date: LocalDate, baseCcy: string, conversionStrategy: string,
                          allAccounts: AccountDTO[], postings: PostingEx[], fx: SingleFXConverter,
                          accountFilter: (a: AccountCommandDTO) => boolean = () => true) {

  const accounts = allAccounts.filter(accountFilter);

  function childrenOfAccount(accountId: string) {
    return accounts.filter(a => parentAccountIdOf(a.accountId) === accountId).sort( (a,b) => a.accountId.localeCompare(b.accountId))
  }

  function findAccount(accountId:string): AccountDTO|undefined {
    return accounts.find(a => a.accountId === accountId)
  }

  function toTreeTable(accountId: string): TreeTableDTO {
    const acct = findAccount(accountId)
    const ps = postings.filter(p => isSubAccountOf(p.account, accountId));
    const pos = postingsToPositionSet(ps)
    if (acct) {
      const balance = convertedPositionSet(pos, baseCcy, conversionStrategy, date, acct, fx)
      return {
        name: accountId,
        shortName: shortAccountId(accountId),
        children: childrenOfAccount(accountId).map(childId => toTreeTable(childId.accountId)),
        assetBalance: Object.entries(balance).map(bits => {return {ccy: bits[0], number: bits[1]}})
      }
    }

    // Return empty
    return {name: accountId, shortName: shortAccountId(accountId), children:[], assetBalance: []}
  }

  return toTreeTable(topAccountId);

}
