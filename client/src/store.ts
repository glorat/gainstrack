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
    balances: {} as AccountBalances,
    parseState: {errors: []},
    gainstrackText: '',
  },
  mutations: {
    increment(state) {
      state.count++;
    },
    reloaded(state, data) {
      state.summary = data;
      state.balances = {} as AccountBalances;
      state.gainstrackText = '';
      state.parseState = {errors: []};
    },
    balances(state, data: AccountBalances) {
      state.balances = data;
      return data;
    },
    parseState(state, data) {
      state.parseState = data;
    },
    gainstrackText(state, data) {
      state.gainstrackText = data;
    },
  },
  actions: {
    increment(context) {
      context.commit('increment');
    },
    balances(context) {
      if (!context.state.balances.Assets) {
        return axios.get('/api/balances/')
            .then(response => {
              context.commit('balances', response.data);
              return response;
            });
      }
    },
    async gainstrackText(context) {
      if (!context.state.gainstrackText) {
        return await axios.get('/api/editor/')
            .then(response => {
              const source = response.data.source;
              context.commit('gainstrackText', source);
              return source;
            });
      } else {
        return context.state.gainstrackText;
      }

    },
    async conversion(context, c) {
      await axios.post('/api/state/conversion', {conversion: c});
      return await this.dispatch('reload')
    },
    reload(context) {
      return axios.get('/api/state/summary')
          .then(response => context.commit('reloaded', response.data))
          // Since components don't know to retrigger this if already on display, let's get it for them
          .then(() => context.dispatch('balances'));
    },
    async dateOverride(context, d) {
      await axios.post('/api/state/dateOverride', {dateOverride: d});
      return this.dispatch('reload');
    },
    parseState(context, data) {
      context.commit('parseState', data);
    }
  },
});


interface AccountBalances {
  Assets?: any;
  Liabilities?: any;
  Equities?: any;
  Income?: any;
  Expenses?: any;
}
