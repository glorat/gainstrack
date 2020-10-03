import axios, {AxiosInstance, AxiosPromise} from 'axios';
import {PostingEx} from 'src/lib/models';
import {SingleFXConverter} from 'src/lib/fx';
import {LocalDate} from 'app/node_modules/@js-joda/core';
import {positionUnderAccount} from 'src/lib/utils';
import {assetReport} from 'src/lib/assetReport';
import {MyState} from 'src/store';
import {Store} from 'vuex';
import {PLExplainDTO, pnlExplain, pnlExplainMonthly} from 'src/lib/PLExplain';

/*
 * The purpose of this file is to control the wiring between state from Component+Vuex
 * to the dependencies needed by business functions
 *
 * It will also mediate between (future) potential calline modes between
 * localCompute (in browser)
 * remote compute (on a server)
 * worker thread compute (in browser/client background threads)
 */

// Type-safe client functions
export async function apiAssetsReport(store: Store<MyState>, args:  {path:string}) {
  const localCompute = true;
  return doGeneric(store, args, localCompute, ax => ax.get('/api/assets/' + args.path), apiLocalAssetsReport)
}

export async function apiPnlExplainMonthly(store: Store<MyState>) {
  const localCompute = true;
  return doGeneric(store, undefined, localCompute, ax => ax.get('/api/pnlexplain/monthly'), apiLocalPnlExplainMonthly)
}

export async function apiPnlExplainDetail(store: Store<MyState>, args: {fromDate:string, toDate:string}) {
  const localCompute = true;
  return doGeneric(store, args, localCompute, ax => ax.post('/api/pnlexplain', args), apiLocalPnlExplainDetail)
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

function apiLocalAssetsReport(store: Store<MyState>, args: {path:string}) {
  const {path} = args;
  const getters = store.getters;
  // Gather dependencies
  const allPostings: PostingEx[] = getters.allPostingsEx;
  const pricer: SingleFXConverter = getters.fxConverter;
  const baseCcy = getters.baseCcy;
  const date = LocalDate.now();
  const pSet = positionUnderAccount(allPostings, path);
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
