import {SingleFXConversion, SingleFXConverter} from '../lib/fx'
import axios from 'axios'
import Vue from 'vue'
import Vuex from 'vuex'
import {
  AccountDTO,
  AllState,
  emptyAllState,
  isTransaction,
  Posting,
  PostingEx,
  QuoteConfig,
  Transaction
} from '../lib/models'
import {flatten} from 'lodash'
import {GlobalPricer} from 'src/lib/pricer';
import {AllStateEx} from "src/lib/AllStateEx";

Vue.use(Vuex);

export interface TimeSeries {
  x: string[]
  y: number[]
  name: string
}

export interface MyState {
  allState: AllState,
  count: number,
  quoteConfig: QuoteConfig[],
  balances: AccountBalances,
  parseState: Record<string, unknown>,
  gainstrackText: string,
  quotes: Record<string, TimeSeries>
}

const initState: MyState = {
  allState: emptyAllState,
  count: 0,
  quoteConfig: [],
  balances: {},
  parseState: { errors: [] },
  gainstrackText: '',
  quotes: {}
};

type FXConverterWrapper = ((fx: SingleFXConversion) => SingleFXConverter)

export default function () {
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
      }
    },
    actions: {
      increment (context) {
        context.commit('increment')
      },
      balances (context) {
        if (!context.state.balances.Assets) {
          return axios.get('/api/balances/')
            .then(response => {
              context.commit('balances', response.data);
              return response
            })
        }
      },
      async loadQuotes (context, ccy: string): Promise<TimeSeries> {
        const ccyToSymbol = (ccy:string):string => {
          const allState = context.state.allState;
          if (allState.fxMapper[ccy]) {
            return allState.fxMapper[ccy]
          } else if (allState.proxyMapper[ccy]) {
            return allState.proxyMapper[ccy]
          } else {
            return ccy;
          }
        };

        const key = ccyToSymbol(ccy);
        // Only obtain from lowest date
        const allPostingsEx: PostingEx[] = context.getters.allPostingsEx;
        const dts = allPostingsEx.filter(p => p.value.ccy === ccy).map(p => p.date).sort();
        const fromDate = dts[0];
        const arg = {key, fromDate};
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
        return await this.dispatch('reload')
      },
      async reload (context) {
        // TODO: These next two can run in parallel
        const response = await context.dispatch('loadAllState');

        const quotesConfig = await axios.get('/api/quotes/config');
        await context.commit('reloadedQuotesConfig', quotesConfig.data);
        // Since components don't know to retrigger this if already on display, let's get it for them
        await context.dispatch('balances');
        return response
      },
      async loadAllState (context) {
        const response = await axios.get('/api/allState');
        await context.commit('allStateLoaded', response.data);
        const ccys: string[] = response.data.priceState.ccys;
        // NOTE: These are all async calls being ignored
        ccys.forEach(ccy => {
          this.dispatch('loadQuotes', ccy);
        });

        return response
      },
      async dateOverride (context, d: string) {
        await axios.post('/api/state/dateOverride', { dateOverride: d });
        return this.dispatch('reload')
      },
      async login (context, data: Record<string, unknown>) {
        const summary = await axios.post('/api/authn/login', data);
        // await context.commit('reloaded', summary.data);

        await context.dispatch('loadAllState');

        // Get stuff in background
        await context.dispatch('balances');

        return summary
      },
      async loginWithToken (context, token: string) {
        const headers = {
            Authorization: `Bearer ${token}` // send the access token through the 'Authorization' header
          }

        axios.defaults.headers.common = headers;

        const summary = await axios.post('/api/authn/login', {});
        // Get stuff in background
        await context.dispatch('balances');
        await context.dispatch('loadAllState');
        return summary
      },
      async logout (context, data: Record<string, any>) {
        const summary = await axios.post('/api/authn/logout', data);
        axios.defaults.headers.common = {}
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
  Assets?: any;
  Liabilities?: any;
  Equities?: any;
  Income?: any;
  Expenses?: any;
}
