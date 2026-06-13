import axios, {AxiosInstance, AxiosPromise} from 'axios';
import {AccountChange, AccountCommandDTO, ParseError, PostingEx} from 'src/lib/assetdb/models';
import {SingleFXConverter} from 'src/lib/fx';
import {LocalDate} from 'app/node_modules/@js-joda/core';
import {convertedPositionSet, formatNumber, isSubAccountOf, positionUnderAccount} from 'src/lib/utils';
import {assetReport} from 'src/lib/assetReport';
import {AppStore} from 'src/stores';
import {PLExplainDTO, pnlExplain, pnlExplainMonthly} from 'src/lib/PLExplain';
import {accountInvestmentReport, CashflowTable, irrSummary} from 'src/lib/AccountInvestmentReport';
import {AllStateEx} from 'src/lib/AllStateEx';

/*
 * The purpose of this file is to control the wiring between state from Component+Pinia
 * to the dependencies needed by business functions
 */

const noRemote = () => {throw new Error('NotImplementedRemotely')}

// Type-safe client functions
export async function apiAssetsReport(store: AppStore, props: Record<string, any>) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, ax => ax.get('/api/assets/' + props.accountId), apiLocalAssetsReport)
}

export async function apiPnlExplainMonthly(store: AppStore) {
  const localCompute = true;
  return doGeneric(store, undefined, localCompute, ax => ax.get('/api/pnlexplain/monthly'), apiLocalPnlExplainMonthly)
}

export async function apiPnlExplainDetail(store: AppStore, props: {fromDate:string, toDate:string}) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, ax => ax.post('/api/pnlexplain', props), apiLocalPnlExplainDetail)
}

export async function apiIrrSummary(store: AppStore) {
  const localCompute = true;
  return doGeneric(store, undefined, localCompute, ax => ax.get('/api/irr/'), apiLocalIrrSummary)
}

export async function apiIrrDetail(store: AppStore, props: Record<string, any>) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, ax => ax.get('/api/irr/' + props.accountId), apiLocalIrrDetail)
}

export async function apiAccountSummary(store: AppStore, props: Record<string, any>) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, noRemote, apiLocalAccountSummary)
}

// Type safe command functions
export interface CmdTestResponse {
  added: AccountCommandDTO[]
  accountChanges: AccountChange[]
  errors: ParseError[]
  networthChange: number
}

export async function apiCmdTest(store: AppStore, props: Record<string, any>): Promise<CmdTestResponse> {
  const stub : (store: AppStore, args:Record<string, any>) => CmdTestResponse = apiStub
  return doGeneric(store, props, false, ax => ax.post('/api/post/test', props), stub);
}


// The keyhole invoker to manage execution strategies
async function doGeneric<ARG,RES>(store: AppStore, args:ARG, localCompute:boolean, axiosFn:(ax:AxiosInstance)=>AxiosPromise<RES>, fn: (store: AppStore, args:ARG) => RES) {
  if (!localCompute) {
    const res2 = await axiosFn(axios);
    return res2.data
  } else {
    return fn(store, args);
  }
}


// The wire-up methods to invoke business logic

function apiLocalAccountSummary(store: AppStore, args: Record<string, any>) {
  const {accountId} = args;
  const allState = store.allState;
  const allStateEx = new AllStateEx(allState);
  const baseCcy = allStateEx.state.baseCcy;
  const postings = allStateEx.allPostingsEx();
  const date = LocalDate.now();
  const fx = store.fxConverter;
  const accts = allState.accounts.filter(a => isSubAccountOf(a.accountId, accountId)).filter(a => !a.options.generatedAccount);
  const data = accts.map(acct => {
    const pos = positionUnderAccount(postings, acct.accountId);
    const pSet = convertedPositionSet(pos, baseCcy, 'global', date, acct, fx);
    const balance = pSet[baseCcy]
    return {accountId: acct.accountId, balance}
  })
  const columns = [
    {name: 'accountId', label: accountId, field: 'accountId', align: 'left'},
    {name: 'balance', label: baseCcy, field: 'balance', format: formatNumber, classes: ['num']}
  ];

  return {data, columns};

}

function apiLocalAssetsReport(store: AppStore, args: Record<string, any>) {
  const {accountId} = args;
  const allPostings: PostingEx[] = store.allPostingsEx;
  const pricer: SingleFXConverter = store.fxConverter;
  const baseCcy = store.baseCcy;
  const date = LocalDate.now();
  const pSet = positionUnderAccount(allPostings, accountId);
  const assetResponse = assetReport(pSet, pricer, baseCcy, date);
  return assetResponse;
}

function apiLocalPnlExplainMonthly(store: AppStore): PLExplainDTO[] {
  const allCmds = store.allState.commands;
  const baseDate = LocalDate.now();
  return pnlExplainMonthly(baseDate, store.allPostingsEx, allCmds, store.baseCcy, store.fxConverter);

}

function apiLocalPnlExplainDetail(store: AppStore, args: {fromDate:string, toDate:string}): PLExplainDTO[] {
  const startDate = LocalDate.parse(args.fromDate);
  const endDate = LocalDate.parse(args.toDate)
  const allCmds = store.allState.commands;
  return [pnlExplain(startDate, endDate, store.allPostingsEx, allCmds, store.baseCcy, store.fxConverter)];

}

function apiLocalIrrSummary(store: AppStore) {
  const defaultFromDate = LocalDate.parse('1900-01-01');
  const fromDate = defaultFromDate;
  const queryDate = LocalDate.now()
  const allAccounts = store.mainAssetAccounts;
  return irrSummary(allAccounts, store.baseCcy, fromDate, queryDate, store.allTxs, store.allPostingsEx, store.fxConverter)
}

function apiLocalIrrDetail(store: AppStore, args: Record<string, any>) {
  const {accountId} = args;
  const defaultFromDate = LocalDate.parse('1900-01-01');
  const fromDate = defaultFromDate
  const queryDate = LocalDate.now()
  const report = accountInvestmentReport(accountId, store.baseCcy, fromDate, queryDate, store.allTxs, store.allPostingsEx, store.fxConverter);

  return postProcessIrrDetail(report);
}

function postProcessIrrDetail(report: { accountId: any; balance?: number; start?: string; end?: string; cashflowTable: CashflowTable; irr?: number; }) {
  const cfs = report.cashflowTable.cashflows
  const name = report.accountId;
  const units = cfs.map(cf => cf.value.ccy);
  const dates = cfs.map(cf => cf.date);
  const values = cfs.map(cf => cf.value.number).map(formatNumber);
  const cvalues = cfs.map(cf =>  cf.convertedValue?.number).map(formatNumber)
  const description = cfs.map(cf => cf.source)
  const detail = {name, units, dates, values, cvalues, description};
  return detail;
}

function apiStub<RES>():RES {
  throw new Error('No local implementation available')
}
