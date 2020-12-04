import axios, {AxiosInstance, AxiosPromise} from 'axios';
import {PostingEx} from 'src/lib/models';
import {SingleFXConverter} from 'src/lib/fx';
import {LocalDate} from 'app/node_modules/@js-joda/core';
import {convertedPositionSet, formatNumber, isSubAccountOf, positionUnderAccount} from 'src/lib/utils';
import {assetReport} from 'src/lib/assetReport';
import {MyState} from 'src/store';
import {Store} from 'vuex';
import {PLExplainDTO, pnlExplain, pnlExplainMonthly} from 'src/lib/PLExplain';
import {accountInvestmentReport, CashflowTable, irrSummary} from 'src/lib/AccountInvestmentReport';
import {AllStateEx} from 'src/lib/AllStateEx';

/*
 * The purpose of this file is to control the wiring between state from Component+Vuex
 * to the dependencies needed by business functions
 *
 * It will also mediate between (future) potential calline modes between
 * localCompute (in browser)
 * remote compute (on a server)
 * worker thread compute (in browser/client background threads)
 */

const noRemote = () => {throw new Error('NotImplementedRemotely')}

// Type-safe client functions
export async function apiAssetsReport(store: Store<MyState>, props: Record<string, any>) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, ax => ax.get('/api/assets/' + props.accountId), apiLocalAssetsReport)
}

export async function apiPnlExplainMonthly(store: Store<MyState>) {
  const localCompute = true;
  return doGeneric(store, undefined, localCompute, ax => ax.get('/api/pnlexplain/monthly'), apiLocalPnlExplainMonthly)
}

export async function apiPnlExplainDetail(store: Store<MyState>, props: {fromDate:string, toDate:string}) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, ax => ax.post('/api/pnlexplain', props), apiLocalPnlExplainDetail)
}

export async function apiIrrSummary(store: Store<MyState>) {
  const localCompute = true;
  return doGeneric(store, undefined, localCompute, ax => ax.get('/api/irr/'), apiLocalIrrSummary)
}

export async function apiIrrDetail(store: Store<MyState>, props: Record<string, any>) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, ax => ax.get('/api/irr/' + props.accountId), apiLocalIrrDetail)
}

export async function apiAccountSummary(store: Store<MyState>, props: Record<string, any>) {
  const localCompute = true;
  return doGeneric(store, props, localCompute, noRemote, apiLocalAccountSummary)
}

// Type safe command functions
export interface CmdTestResponse {
  added: string[]
  accountChanges: unknown[]
  errors: string[]
}

export async function apiCmdTest(store: Store<MyState>, props: Record<string, any>): Promise<CmdTestResponse> {
  const stub : (store: Store<MyState>, args:Record<string, any>) => CmdTestResponse = apiStub
  return doGeneric(store, props, false, ax => ax.post('/api/post/test', props), stub);
}


// The keyhole invoker to manage execution strategies
async function doGeneric<ARG,RES>(store: Store<MyState>, args:ARG, localCompute:boolean, axiosFn:(ax:AxiosInstance)=>AxiosPromise<RES>, fn: (store: Store<MyState>, args:ARG) => RES) {
  if (!localCompute) {
    const res2 = await axiosFn(axios);
    return res2.data
  } else {
    return fn(store, args);
  }
}


// The wire-up methods to invoke business logic

function apiLocalAccountSummary(store: Store<MyState>, args: Record<string, any>) {
  const {accountId} = args;
  const allState = store.state.allState;
  const allStateEx = new AllStateEx(allState);
  const baseCcy = allStateEx.state.baseCcy;
  const postings = allStateEx.allPostingsEx();
  const date = LocalDate.now(); // TODO: Pull from somewhere
  const fx = store.getters.fxConverter;
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

function apiLocalAssetsReport(store: Store<MyState>, args: Record<string, any>) {
  const {accountId} = args;
  const getters = store.getters;
  // Gather dependencies
  const allPostings: PostingEx[] = getters.allPostingsEx;
  const pricer: SingleFXConverter = getters.fxConverter;
  const baseCcy = getters.baseCcy;
  const date = LocalDate.now();
  const pSet = positionUnderAccount(allPostings, accountId);
  const assetResponse = assetReport(pSet, pricer, baseCcy, date);
  return assetResponse;
}

function apiLocalPnlExplainMonthly(store: Store<MyState>): PLExplainDTO[] {
  const allCmds = store.state.allState.commands;
  const getters = store.getters;
  const baseDate = LocalDate.now();
  return pnlExplainMonthly(baseDate, getters.allPostingsEx, allCmds, getters.baseCcy, getters.fxConverter);

}

function apiLocalPnlExplainDetail(store: Store<MyState>, args: {fromDate:string, toDate:string}): PLExplainDTO[] {
  const startDate = LocalDate.parse(args.fromDate);
  const endDate = LocalDate.parse(args.toDate)
  const allCmds = store.state.allState.commands;
  const getters = store.getters;
  return [pnlExplain(startDate, endDate, getters.allPostingsEx, allCmds, getters.baseCcy, getters.fxConverter)];

}

function apiLocalIrrSummary(store: Store<MyState>) {
  const getters = store.getters;

  const defaultFromDate = LocalDate.parse('1900-01-01');
  const fromDate = defaultFromDate;
  const queryDate = LocalDate.now() // Or date override
  const allAccounts = getters.mainAssetAccounts;
  return irrSummary(allAccounts, getters.baseCcy, fromDate, queryDate, getters.allTxs, getters.allPostingsEx, getters.fxConverter)
}

function apiLocalIrrDetail(store: Store<MyState>, args: Record<string, any>) {
  const {accountId} = args;
  const getters = store.getters;
  const defaultFromDate = LocalDate.parse('1900-01-01');
  const fromDate = defaultFromDate
  const queryDate = LocalDate.now() // Or date override
  const report = accountInvestmentReport( accountId, getters.baseCcy, fromDate, queryDate, getters.allTxs, getters.allPostingsEx, getters.fxConverter);

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
