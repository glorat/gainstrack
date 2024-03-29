import {SingleFXConversion, SingleFXConverter} from '../lib/fx'
import axios, {AxiosRequestConfig, InternalAxiosRequestConfig} from 'axios'
import {
  AccountDTO,
  AllState, AssetDTO,
  emptyAllState,
  PostingEx,
  Transaction, TreeTableDTO
} from '../lib/assetdb/models'
import {GlobalPricer} from '../lib/pricer';
import {AllStateEx} from '../lib/AllStateEx';
import {cloneDeep, includes, keys, mergeWith} from 'lodash'
import {balanceTreeTable} from '../lib/TreeTable';
import {LocalDate} from '@js-joda/core';
import {toCommodityGainstrack} from '../lib/commandDefaulting';
import { store } from 'quasar/wrappers'
import {QuoteSource} from 'src/lib/assetdb/assetDb';
import firebase from 'firebase/compat/app';
import {Notify} from 'quasar';
import VuexPersistence from 'vuex-persist';
import { createStore, Store as VuexStore, useStore as vuexUseStore } from 'vuex'
import {InjectionKey} from 'vue';

export interface TimeSeries {
  x: string[]
  y: number[]
  name: string
}


export interface MyState {
  allState: AllState,
  dateOverride?: LocalDate
  count: number,
  quoteConfig: QuoteSource[],
  balances: AccountBalances,
  parseState: Record<string, unknown>,
  gainstrackText: string,
  quotes: Record<string, TimeSeries>,
  conversion: string
  user: firebase.User | undefined
  auth0token: string | undefined
}


export interface ForecastVuexState {
  params: any
}

export interface MyRoot {
  forecast:ForecastVuexState
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
  user: undefined,
  auth0token: undefined
};

const vuexLocal = new VuexPersistence<MyState>({
  storage: window.localStorage,
  modules: ['forecast'],
});

type FXConverterWrapper = ((fx: SingleFXConversion) => SingleFXConverter)

// provide typings for `this.$store`
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $store: VuexStore<MyState & MyRoot>
  }
}

// provide typings for `useStore` helper
export const storeKey: InjectionKey<VuexStore<MyState>> = Symbol('vuex-key')


export default store(function (/* { ssrContext } */) {
  let requestPreprocessor = async (config:InternalAxiosRequestConfig):Promise<InternalAxiosRequestConfig> => {
    return config;
  }
  axios.interceptors.request.use(
      config => {
        return requestPreprocessor(config)
      },
      error => {
        return Promise.reject(error);
      }
  );

  axios.interceptors.response.use(res => res, function (error) {
    if (error.response.status === 401) {
      // Same origin authenticated requests handling
      if (error.request.responseURL.startsWith (window.location.origin)) {
        Notify.create({
          message: 'Please log out and in again!',
          type: 'negative'
        });
        // store.dispatch('logout')
        // router.push('/login')
        return Promise.reject(error)
      } else {
        return error; // Let the caller sort it out
      }


    }
  });

  const forecastModule = {
    namespaced: true,
    state: () => ({params: undefined } as ForecastVuexState),
    mutations: {
      forecastParamsUpdated(state: ForecastVuexState, params: any) {
        state.params = params
      }
    },
    actions: {
      updateForecastParams(context:any, params:any) {
        context.commit('forecastParamsUpdated', params)
      }
    }
  }

  const Store = createStore({
    state: initState,
    plugins: [vuexLocal.plugin],
    modules: {
      forecast: forecastModule
    },
    mutations: {
      auth0token(state: MyState, token) {
        state.auth0token = token
      },
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
        state.quotes[data.key] = data.series
        // state.quotes[data.key] = data.series;
      },
      multiQuotesUpserted(state: MyState, data: { key: string, series: TimeSeries }[]) {
        data.forEach(row => {
          state.quotes[row.key] = row.series;
        })
      },
      conversionApplied(state: MyState, conversion: string) {
        state.conversion = conversion;
      },
      dateOverriden(state: MyState, dt: LocalDate) {
        state.dateOverride = dt;
      },
      assetUpserted(state: MyState, asset: AssetDTO) {
        const originalAssets = state.allState.assetState;
        const orig = originalAssets.find(x => x.asset === asset.asset)
        if (orig === undefined) throw new Error('Invariant violation in assetSave')
        const idx = originalAssets.indexOf(orig)
        Object.assign(originalAssets[idx], cloneDeep(asset))
      },
      userChanged (state: MyState, userData: firebase.User|undefined) {
        state.user = userData
      }
    },
    actions: {
      increment (context) {
        context.commit('increment')
      },
      changeUser (context, userData?: firebase.User|undefined) {
        context.commit('userChanged', userData)
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
            const response = await axios.post('/api/balances/')
            context.commit('balances', response.data);
            return response

          }
        }
      },
      async loadMultiQuotes(context, ccys: string[]): Promise<TimeSeries[]> {
        const quoteDeps = context.getters.quoteDeps;
        const reqs = ccys.map(ccy => {
          const deps = quoteDeps[ccy];

          // All posting ccys that depend on this ccy
          const depFilter = (p:PostingEx) => includes(deps, p.value.ccy);
          // Only obtain from lowest date
          const allPostingsEx: PostingEx[] = context.getters.allPostingsEx;
          const dts = allPostingsEx.filter(depFilter).map(p => p.date).sort();
          const fromDate = dts[0] ?? LocalDate.now(); // Default today better?
          return {name: ccy, fromDate};
        });
        // To prevent stampeding horde and repeated requests to not-exists
        const blanks = reqs.map(req => {return { key: req.name, series: { x: [], y: [], name: req.name }}});
        context.commit('multiQuotesUpserted', blanks);

        const response = await axios.post('/api/quotes/tickers', {quotes: reqs});
        const multiSeries: TimeSeries[] = response.data;
        context.commit('multiQuotesUpserted', multiSeries.map(row => {return {key:row.name, series: row}}));
        return multiSeries;
      },
      async loadQuotes (context, ccy: string): Promise<TimeSeries> {
        const quoteDeps = context.getters.quoteDeps;
        const key = quoteDeps[ccy];
        if (key && context.state.quotes[key]) {
          return context.state.quotes[key]
        } else {
          const multi = await context.dispatch('loadMultiQuotes', [ccy]);
          return multi[0];
        }
      },
      async loadQuotesRaw (context, key: string): Promise<TimeSeries> {
        if (key && context.state.quotes[key]) {
          return context.state.quotes[key]
        } else {
          const multi = await context.dispatch('loadMultiQuotes', [key]);
          return multi[0];
        }
      },
      async gainstrackText (context) {
        if (!context.state.gainstrackText) {
          return await axios.post('/api/editor/')
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
        context.commit('balances', {});
        await context.dispatch('balances');
        return;
      },
      async reload (context) {
        // TODO: These next two can run in parallel
        const response = await context.dispatch('loadAllState');

        const quotesConfig = await axios.get('/api/quotes/config');
        await context.commit('reloadedQuotesConfig', quotesConfig.data);
        return response
      },
      async loadAllState (context) {
        const response = await axios.post('/api/allState');
        await context.commit('allStateLoaded', response.data);
        const quoteDeps = context.getters.quoteDeps;
        const quotesToLoad = keys(quoteDeps);
        console.log(`Pre-load quotes for ${quotesToLoad.join(',')}`);
        // for (const i in quotesToLoad) {
        //   //console.log(`before ${quotesToLoad[i]}`);
        //   await this.dispatch('loadQuotes', quotesToLoad[i]);
        //   //console.log(`after ${quotesToLoad[i]}`);
        // }
        await this.dispatch('loadMultiQuotes', quotesToLoad);
        console.log('Pre-load of quotes complete');

        await context.dispatch('balances');

        return response
      },
      async dateOverride (context, d: string) {
        await axios.post('/api/state/dateOverride', { dateOverride: d });
        context.commit('dateOverriden', LocalDate.parse(d))

        await context.dispatch('balances');
      },
      async upsertAsset(context, asset: AssetDTO) {
        const str = toCommodityGainstrack(asset)
        const res = await axios.post('/api/post/asset', { str })
        context.commit('assetUpserted', asset)
        return res

      },
      async login (context, data: Record<string, unknown>) {
        const summary = await axios.post('/api/authn/login', data);
        // await context.commit('reloaded', summary.data);

        await context.dispatch('loadAllState');

        return summary
      },
      async loginWithToken (context, getToken: () => Promise<string>) {

        requestPreprocessor = async (config) => {
          const token = await getToken();
          config.headers['Authorization'] = `Bearer ${token}`;
          return config;
        }

        // Snapshot the token
        const token = await getToken();
        context.commit('auth0token', token);

        // Get stuff in background
        return await context.dispatch('loadAllState');
      },
      async logout (context) {
        requestPreprocessor = async (config) => config;
        context.commit('auth0token', undefined);
        return await context.dispatch('loadAllState');

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
      },
      allCcys: (state): string[] => {
        return state.allState.ccys;
      },
    }
  });
  return Store
})

export function useStore(): VuexStore<MyState> {
  return vuexUseStore(storeKey)
}

interface AccountBalances {
  Assets?: TreeTableDTO;
  Liabilities?: TreeTableDTO;
  Equities?: TreeTableDTO;
  Income?: TreeTableDTO;
  Expenses?: TreeTableDTO;
}
