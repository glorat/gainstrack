import axios from 'axios';
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

interface MyState {
    count: number,
    summary: object,
    balances: AccountBalances,
    parseState: object,
    gainstrackText: string
}

const initState: MyState = {
    count: 0,
    summary: {
        accountIds: [],
        ccys: [],
        authentication: {}
    },
    balances: {},
    parseState: {errors: []},
    gainstrackText: '',
}

export default new Vuex.Store({
    state: initState,
    mutations: {
        increment(state) {
            state.count++;
        },
        reloaded(state, data) {
            state.summary = data;
            state.balances = {};
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
        gainstrackText(state, data: string) {
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
        async conversion(context, c: string) {
            await axios.post('/api/state/conversion', {conversion: c});
            return await this.dispatch('reload');
        },
        async reload(context) {
            const response = await axios.get('/api/state/summary');
            await context.commit('reloaded', response.data);
            // Since components don't know to retrigger this if already on display, let's get it for them
            await context.dispatch('balances');
            return response;
        },
        async dateOverride(context, d: string) {
            await axios.post('/api/state/dateOverride', {dateOverride: d});
            return this.dispatch('reload');
        },
        async login(context, data: object) {
            const summary = await axios.post('/api/authn/login', data);
            await context.commit('reloaded', summary.data);
            // Get stuff in background
            context.dispatch('balances');
            return summary;

        },
        async logout(context, data: object) {
            const summary = await axios.post('/api/authn/logout', data);
            await context.commit('reloaded', summary.data);
            return summary;

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
