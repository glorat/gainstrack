import {FXChain, FXMapped, FXMarketLazyLoad, FXProxy, SingleFXConversion, SingleFXConverter} from '../lib/fx'
import axios from 'axios'
import Vue from 'vue'
import Vuex from 'vuex'
import {AccountDTO, AllState, emptyAllState, isTransaction, Posting, QuoteConfig} from '../lib/models'
import {flatten} from 'lodash'

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
      async loadQuotes (context, key: string): Promise<TimeSeries> {
        if (context.state.quotes[key]) {
          return context.state.quotes[key]
        } else {
          // Commit a placeholder first to prevent stampeding horde
          console.log(`Loading quotes for ${key}`);
          context.commit('quotesUpserted', { key, series: { x: [], y: [], name: key } });
          const response = await axios.get('/api/quotes/ticker/' + key);
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
        const lazyLoad = (nm: string) => this.dispatch('loadQuotes', nm);
        const wrapper: FXConverterWrapper = marketFx => new FXMarketLazyLoad(marketFx, lazyLoad);

        const fxconv: SingleFXConverter = this.getters.customFxConverter(wrapper);
        ccys.forEach(ccy => fxconv.getFX(ccy, 'USD', '2000-01-01'));
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
        const config = {
          headers: {
            Authorization: `Bearer ${token}` // send the access token through the 'Authorization' header
          }
        };

        axios.defaults.headers.common = config.headers;

        const summary = await axios.post('/api/authn/login', {});
        // Get stuff in background
        await context.dispatch('balances');
        await context.dispatch('loadAllState');
        return summary
      },
      async logout (context, data: Record<string, any>) {
        const summary = await axios.post('/api/authn/logout', data);
        await context.dispatch('loadAllState');
        return summary
      },
      parseState (context, data) {
        context.commit('parseState', data)
      }
    },
    getters: {
      accountIds: state => {
        return state.allState.accountIds;
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
      tradeFxConverter: state => {
        const allState = state.allState;
        if (allState) {
          const tradeFxData: { baseCcy: string; data: Record<string, { ks: string[]; vs: number[] }> } | undefined = allState.tradeFx;
          if (tradeFxData) {
            return SingleFXConversion.fromDTO(tradeFxData.data, tradeFxData.baseCcy)
          }
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

        return new FXChain([
          new FXMapped(allState.fxMapper, wrapped),
          new FXProxy(allState.proxyMapper, tradeFxConverter, wrapped),
          tradeFxConverter
        ])
      },
      fxConverter: (state, getters) => {
        const identity: FXConverterWrapper = x => x;
        const curried = getters.customFxConverter;
        return curried(identity)
      },
      allTxs: (state) => {
        return state.allState.txs.filter(isTransaction);
      },
      allPostings: (state) => {
        const allTxPostings : Posting[][] = state.allState.txs.map(tx => isTransaction(tx) ?  tx.postings : []);
        const allPostings = flatten(allTxPostings);
        return allPostings;
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
