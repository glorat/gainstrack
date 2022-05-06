import {ChronoUnit, LocalDate} from '@js-joda/core';
import {Amount, PostingEx, Transaction} from 'src/lib/assetdb/models';
import {SingleFXConverter} from 'src/lib/fx';
import {convertAccountType, isSubAccountOf, positionSetFx, positionUnderAccount} from 'src/lib/utils';
import {some} from 'lodash';

const AccountTypes = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses']

function calcInflows(txs: Transaction[], accountId: string) {
  const relatedAccounts = AccountTypes.map(t => convertAccountType(accountId, t))
  const flows: Cashflow[] = [];
  txs.map(tx => {
    const fps = tx.postings;
    // const prefix = convertAccountType
    const others = fps.filter(p => !(isSubAccountOf(p.account, accountId) || some(relatedAccounts, pp => isSubAccountOf(p.account, pp))))
    if (others.length > 0 && others.length < fps.length) {
      if (others.length !== 1) throw new Error('Inflow calculator can only handle single external flow target currently');
      flows.push(new Cashflow(LocalDate.parse(tx.postDate), others[0].value, others[0].account))
    }
  })
  return flows;
}

export function accountInvestmentReport(accountId: string, ccy: string, fromDate: LocalDate, queryDate: LocalDate,
                                 allTxs: Transaction[], allPostings: PostingEx[], fx: SingleFXConverter) {

  // const postings = allPostings.filter(p => LocalDate.parse(p.date).isAfter(fromDate) && LocalDate.parse(p.date).isBefore(queryDate.plusDays(1)));
  const txs = allTxs.filter(p => LocalDate.parse(p.postDate).isAfter(fromDate) && LocalDate.parse(p.postDate).isBefore(queryDate.plusDays(1)));
  const inflows = calcInflows(txs, accountId);
  const firstDate = (inflows[0]?.date.minusDays(1) ?? fromDate)

  const startPs = positionUnderAccount(allPostings.filter(p => LocalDate.parse(p.date).isBefore(firstDate.plusDays(1))), accountId)
  // Minus for starting value
  const startBalance = - positionSetFx(startPs, ccy, firstDate, fx)

  const endPs = positionUnderAccount(allPostings.filter(p => LocalDate.parse(p.date).isBefore(queryDate.plusDays(1))), accountId)
  const endBalance = positionSetFx(endPs, ccy, queryDate, fx)

  let baseFlows: Cashflow[] = [];
  if (startBalance !== 0.0) baseFlows.push(new Cashflow(firstDate, {number: startBalance, ccy}, accountId))
  baseFlows = [...baseFlows, ...inflows, new Cashflow(queryDate, {number: endBalance, ccy}, accountId)]

  baseFlows.forEach(cf => {
    cf.convertedValue = {ccy, number: positionSetFx({[cf.value.ccy]: cf.value.number}, ccy, cf.date, fx)}
  })

  const cashflowTable = new CashflowTable(baseFlows)

  const pnlGain = endBalance - startBalance
  const flowGain = inflows.reduce((prev, curr) => {
    return prev + curr.convertedValue!.number;
  }, 0.0);

  return {
    accountId,
    balance: endBalance,
    start: baseFlows[0].date.toString(),
    end: baseFlows[baseFlows.length-1].date.toString(),
    cashflowTable,
    irr: cashflowTable.irr(),
    pnlGain,
    flowGain
  }
}

export function irrSummary(accountIds: string[], ccy: string, fromDate: LocalDate, queryDate: LocalDate,
                           allTxs: Transaction[], allPostings: PostingEx[], fx: SingleFXConverter) {
  return accountIds.map(accountId => {
    return accountInvestmentReport(accountId, ccy, fromDate, queryDate, allTxs, allPostings, fx)
  })
}

class Cashflow {
  date: LocalDate
  value: Amount
  source: string
  convertedValue: Amount | undefined

  constructor(date: LocalDate, value: Amount, source: string, convertedValue: Amount | undefined = undefined) {
    this.date = date
    this.value = value
    this.source = source
    this.convertedValue = convertedValue
  }

  pv(baseDate: LocalDate, discountRate: number) {
    if (!this.convertedValue) throw new Error('convertedValue required for PV')
    const days = ChronoUnit.DAYS.between(baseDate, this.date)
    const dcf = days / 365.0 // Using Act365 for simplicity
    const cfpv = this.convertedValue.number / Math.pow(1 + discountRate, dcf)
    return cfpv
  }

  pv01(baseDate: LocalDate, rate: number): number {
    if (!this.convertedValue) throw new Error('convertedValue required for PV')
    const days = ChronoUnit.DAYS.between(baseDate, this.date)
    const dcf = days / 365.0 // Using Act365 for simplicity

    const amount: number = this.convertedValue.number

    if (dcf == 0) return 0
    else if (-1 < rate) return -dcf * amount / Math.pow(1 + rate, dcf + 1)
    else if (rate < -1) return 0 // FIXME: ???
    else return 0
  }
}

export class CashflowTable {
  cashflows: Cashflow[]
  constructor(cashflows: Cashflow[]) {
    this.cashflows = cashflows.sort( (a,b) => a.date.compareTo(b.date))
  }

  npv(discountRate: number): number {
    const baseDate = this.cashflows[0].date
    const npv = this.cashflows.reduce((prev, curr) => {
      const cfpv = curr.pv(baseDate, discountRate)
      return prev + cfpv;
    }, 0.0);
    return npv;
  }

  delta(discountRate: number): number {
    const baseDate = this.cashflows[0].date
    return this.cashflows.reduce((delta, cf) => {
      return delta + cf.pv01(baseDate, discountRate)
    }, 0.0)
  }

  irr(): number {
    return newtonRaphson(r => this.npv(r), r=>this.delta(r), 0.01, 0.000001, 25)
  }

}

function newtonRaphson(f: (x: number) => number, d: (x: number) => number, xk: number, tolerance: number, maxIter: number): number {

  const x = xk - f(xk) / d(xk);
  const y = f(x) + d(x) * (x - xk)
  // console.log(`Newton Raphson at ${xk} to ${x} at ${y}`)

  if (maxIter <= 0 || Math.abs(y) < tolerance) {
    // console.log(`Newton Raphson resolved to ${y} with ${maxIter} iterations remaining`)
    return xk
  } // Resolved
  else return newtonRaphson(f, d, x, tolerance, maxIter - 1) // Not resolved, run next iteration
}
