import {SingleFXConversion, SingleFXConverter} from '../lib/fx'
import axios, {AxiosRequestConfig} from 'axios'
import Vue from 'vue'
import Vuex from 'vuex'
import {
  AccountDTO,
  AllState,
  emptyAllState,
  PostingEx,
  QuoteConfig,
  Transaction, TreeTableDTO
} from '../lib/models'
import {GlobalPricer} from 'src/lib/pricer';
import {AllStateEx} from 'src/lib/AllStateEx';
import { includes, uniq, flatten, merge, keys, mergeWith } from 'lodash'
import {balanceTreeTable} from 'src/lib/TreeTable';
import {LocalDate} from '@js-joda/core';

Vue.use(Vuex);

export interface TimeSeries {
  x: string[]
  y: number[]
  name: string
}

export interface MyState {
  allState: AllState,
  dateOverride?: LocalDate
  count: number,
  quoteConfig: QuoteConfig[],
  balances: AccountBalances,
  parseState: Record<string, unknown>,
  gainstrackText: string,
  quotes: Record<string, TimeSeries>,
  conversion: string
}

const initState: MyState = {
  allState: emptyAllState,
  dateOverride: undefined,
  count: 0,
  quoteConfig: [],
  balances: {},
  parseState: { errors: [] },
  gainstrackText: '',
  quotes: {},
  conversion: 'parent',
};

type FXConverterWrapper = ((fx: SingleFXConversion) => SingleFXConverter)

export default function () {

  let requestPreprocessor = async (config:AxiosRequestConfig):Promise<AxiosRequestConfig> => {
    return config;
  }

  axios.interceptors.request.use(function (config) {
    return requestPreprocessor(config);
  }, function (error) {
    // Do something with request error
    return Promise.reject(error);
  });


  const Store = new Vuex.Store<MyState>({
    state: initState,
    mutations: {
      increment (state: MyState) {
        state.count++
      },
      reloadedQuotesConfig (state: MyState, data) {
        state.quoteConfig = data
      },
      balances (state: MyState, data: AccountBalances) {
        state.balances = data;
        return data
      },
      parseState (state: MyState, data) {
        state.parseState = data
      },
      gainstrackText (state: MyState, data: string) {
        state.gainstrackText = data
      },
      allStateLoaded (state: MyState, data: AllState) {
        state.balances = {};
        state.gainstrackText = '';
        state.parseState = { errors: [] };
        state.count ++;

        state.allState = data
      },
      quotesUpserted (state: MyState, data: { key: string, series: TimeSeries }) {
        Vue.set(state.quotes, data.key, data.series)
        // state.quotes[data.key] = data.series;
      },
      conversionApplied(state: MyState, conversion: string) {
        state.conversion = conversion;
      },
      dateOverriden(state: MyState, dt: LocalDate) {
        state.dateOverride = dt;
      }
    },
    actions: {
      increment (context) {
        context.commit('increment')
      },
      async balances (context) {
        const getters = context.getters;
        const localCompute = true;
        if (!context.state.balances.Assets) {
          if (localCompute) {
            const state:MyState = context.state;
            const conversion = state.conversion;
            const today = state.dateOverride ?? LocalDate.now();
            const forCategory = (cat:string) => balanceTreeTable(cat, today, getters.baseCcy, conversion,
              state.allState.accounts, getters.allPostingsEx, getters.fxConverter)
            const foo: AccountBalances = {
              Assets: forCategory('Assets'),
              Liabilities: forCategory('Liabilities'),
              Expenses: forCategory('Expenses'),
              Income: forCategory('Income'),
              Equities: forCategory('Equity')
            }
            context.commit('balances', foo);
            return foo
          } else {
            const response = await axios.get('/api/balances/')
            context.commit('balances', response.data);
            return response

          }
        }
      },
      async loadQuotes (context, ccy: string): Promise<TimeSeries> {
        // TODO: Elegantly remove the reliance on fxMapper/proxyMapper and use GlobalPricer
        const cmds = context.state.allState.commands;
        const assets = cmds.filter(x => x.commandType === 'commodity');
        const quoteDeps = context.getters.quoteDeps;
        const deps = quoteDeps[ccy];

        // All posting ccys that depend on this ccy
        const depFilter = (p:PostingEx) => includes(deps, p.value.ccy);
        // Only obtain from lowest date
        const allPostingsEx: PostingEx[] = context.getters.allPostingsEx;
        const dts = allPostingsEx.filter(depFilter).map(p => p.date).sort();
        const fromDate = dts[0];
        const arg = {key: ccy, fromDate};
        return await context.dispatch('loadQuotesEx', arg);
      },
      async loadQuotesEx (context, args: {key: string, fromDate: string}): Promise<TimeSeries> {
        const {key, fromDate} = args;
        if (context.state.quotes[key]) {
          return context.state.quotes[key]
        } else {
          // Commit a placeholder first to prevent stampeding horde
          console.log(`Loading quotes for ${key}`);
          context.commit('quotesUpserted', { key, series: { x: [], y: [], name: key } });
          const params = {fromDate};
          const response = await axios.get('/api/quotes/ticker/' + key, {params});
          const series: TimeSeries = response.data;
          context.commit('quotesUpserted', { key, series });
          console.log(`Applied quotes for ${key}`);
          return series
        }
      },
      async gainstrackText (context) {
        if (!context.state.gainstrackText) {
          return await axios.get('/api/editor/')
            .then(response => {
              const source = response.data.source;
              context.commit('gainstrackText', source);
              return source
            })
        } else {
          return context.state.gainstrackText
        }
      },
      async conversion (context, c: string) {
        await axios.post('/api/state/conversion', { conversion: c });
        context.commit('conversionApplied', c);
        return await this.dispatch('reload')
      },
      async reload (context) {
        // TODO: These next two can run in parallel
        const response = await context.dispatch('loadAllState');

        const quotesConfig = await axios.get('/api/quotes/config');
        await context.commit('reloadedQuotesConfig', quotesConfig.data);
        return response
      },
      async loadAllState (context) {
        const response = await axios.get('/api/allState');
        await context.commit('allStateLoaded', response.data);
        const quoteDeps = context.getters.quoteDeps;
        const quotesToLoad = keys(quoteDeps);
        console.log(`Pre-load quotes for ${quotesToLoad.join(',')}`);
        for (const i in quotesToLoad) {
          //console.log(`before ${quotesToLoad[i]}`);
          await this.dispatch('loadQuotes', quotesToLoad[i]);
          //console.log(`after ${quotesToLoad[i]}`);
        }

        await context.dispatch('balances');

        return response
      },
      async dateOverride (context, d: string) {
        await axios.post('/api/state/dateOverride', { dateOverride: d });
        context.commit('dateOverriden', LocalDate.parse(d))

        await context.dispatch('balances');
      },
      async login (context, data: Record<string, unknown>) {
        const summary = await axios.post('/api/authn/login', data);
        // await context.commit('reloaded', summary.data);

        await context.dispatch('loadAllState');

        return summary
      },
      async loginWithToken (context, auth) {

        requestPreprocessor = async (config) => {
          const token = await auth.getTokenSilently();
          config.headers.common = {
            Authorization: `Bearer ${token}` // send the access token through the 'Authorization' header
          };
          return config;
        }

        const summary = await axios.post('/api/authn/login', {});
        // Get stuff in background
        await context.dispatch('loadAllState');

        return summary
      },
      async logout (context, data: Record<string, any>) {
        const summary = await axios.post('/api/authn/logout', data);
        requestPreprocessor = async (config) => config;
        await context.dispatch('loadAllState');
        return summary
      },
      parseState (context, data) {
        context.commit('parseState', data)
      }
    },
    getters: {
      allStateEx: state => {
        return new AllStateEx(state.allState);
      },
      accountIds: state => {
        return state.allState.accounts.map(x => x.accountId);
      },
      reloadCounter: state => {
        return state.count;
      },
      tradeableAccounts: state => {
        const all = state.allState.accounts;
        const scope = all.filter(
          x => x.accountId.startsWith('Asset') &&
            x.options.multiAsset &&
            !x.options.generatedAccount
        );
        return scope.map(x => x.accountId).sort()
      },
      mainAssetAccounts: state => {
        const all = state.allState.accounts;
        const scope = all.filter(x => x.accountId.startsWith('Asset') && !x.options.generatedAccount);
        return scope.map(x => x.accountId).sort()
      },
      mainAccounts: state => {
        return state.allState.accounts.filter(acct => {
          return (acct.options.generatedAccount === false)
        }).map(a => a.accountId).sort()
      },
      findAccount: state => (accountId: string) => {
        const all: AccountDTO[] = state.allState.accounts;
        const acct = all.find(x => x.accountId === accountId);
        return acct
      },
      baseCcy: state => {
        return state.allState.baseCcy
      },
      tradeFxConverter: (state, getters) => {
        const allState = state.allState;
        if (allState) {
          return getters.allStateEx.tradeFxConverter()
        }
        return SingleFXConversion.empty()
      },
      customFxConverter: (state, getters) => (wrapper: FXConverterWrapper) => {
        const myState: MyState = state;
        const quotes = myState.quotes;
        const allState = myState.allState;
        const tradeFxConverter = getters.tradeFxConverter;
        const marketFx = SingleFXConversion.fromQuotes(quotes);
        const wrapped = wrapper(marketFx);

        return new GlobalPricer(allState.commands, allState.ccys, tradeFxConverter, wrapped)
        //
        // return new FXChain([
        //   new FXMapped(allState.fxMapper, wrapped),
        //   new FXProxy(allState.proxyMapper, tradeFxConverter, wrapped),
        //   tradeFxConverter
        // ])
      },
      fxConverter: (state, getters) => {
        const identity: FXConverterWrapper = x => x;
        const curried = getters.customFxConverter;
        return curried(identity)
      },
      quoteDeps: (state, getters) => {
        const pricer:GlobalPricer = getters.fxConverter;
        const assets = state.allState.assetState;
        const reducer = (prev:Record<string, string[]>, item: Record<string, string[]>) => mergeWith(prev, item, (x,y) => (x||[]).concat(y));
        const allDeps = assets.map(asset => pricer.quotesRequired(asset));
        const quoteDeps = allDeps.reduce(reducer, {});
        return quoteDeps;
      },
      allTxs: (state, getters):Transaction[] => {
        return getters.allStateEx.allTxs()
      },
      allPostings: (state, getters) => {
        return getters.allStateEx.allPostings()
      },
      allPostingsEx: (state, getters): PostingEx[] => {
        return getters.allStateEx.allPostingsEx()
      }
    }
  });
  return Store
}

interface AccountBalances {
  Assets?: TreeTableDTO;
  Liabilities?: TreeTableDTO;
  Equities?: TreeTableDTO;
  Income?: TreeTableDTO;
  Expenses?: TreeTableDTO;
}
