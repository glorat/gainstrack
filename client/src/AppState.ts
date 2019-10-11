import Vuex from 'vuex';

const createStore = () => new Vuex.Store({
    state: {
        count: 0,
    },
    mutations: {
        increment(state) {
            state.count++;
        },
    },
    actions: {
        increment(context) {
            context.commit('increment');
        },
    },
});

export default createStore;
