import {AccountCommandDTO, AccountDTO, PostingEx, TreeTableDTO} from "src/lib/models";
import { LocalDate } from "@js-joda/core";
import {SingleFXConverter} from "src/lib/fx";
import {
  convertedPositionSet,
  isSubAccountOf,
  parentAccountIdOf,
  positionUnderAccount,
  postingsToPositionSet
} from "src/lib/utils";

function shortAccountId(accountId: string) {
  const bits = accountId.split(':')
  return bits.length ? bits[bits.length-1] : '';
}

export function balanceTreeTable(topAccountId: string, date: LocalDate, baseCcy: string, conversionStrategy: string,
                          allAccounts: AccountDTO[], postings: PostingEx[], fx: SingleFXConverter,
                          accountFilter: (a: AccountCommandDTO) => boolean = _ => true) {

  const accounts = allAccounts.filter(accountFilter);

  function childrenOfAccount(accountId: string) {
    return accounts.filter(a => parentAccountIdOf(a.accountId) === accountId)
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
        assetBalance: balance
      }
    }

    // Return empty
    return {name: accountId, shortName: shortAccountId(accountId), children:[], assetBalance: {}}
  }

  return toTreeTable(topAccountId);

}
