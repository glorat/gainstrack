import axios from 'axios';
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    count: 0,
    summary: {
      accountIds: [],
      ccys: [],
    },
    balances : {} as AccountBalances,
  },
  mutations: {
    increment(state) {
      state.count++;
    },
    reloaded(state, data) {
      state.summary = data;
      state.balances = {} as AccountBalances;
    },
    balances(state, data: AccountBalances) {
      state.balances = data;
      return data;
    },
  },
  actions: {
    increment(context) {
      context.commit('increment');
    },
    balances(context) {
      if (!context.state.balances.Assets ) {
        return axios.get('/api/balances/')
            .then(response => {
              context.commit('balances', response.data);
              return response;
            });
      }
    },
    reload(context) {
      return axios.get('/api/state/summary/')
          .then(response => context.commit('reloaded', response.data))
          // Since components don't know to retrigger this if already on display, let's get it for them
          .then(() => context.dispatch('balances'));
    },
  },
});


interface AccountBalances {
  Assets?: any;
  Liabilities?: any;
  Equities?: any;
  Income?: any;
  Expenses?: any;
}
