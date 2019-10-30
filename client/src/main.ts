import {Notification} from 'element-ui';
import store from './store';
import App from './App.vue';
import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Vuex from 'vuex';
import Account from './views/Account.vue';
import BalanceSheet from './views/BalanceSheet.vue';
import Command from './views/Command.vue';
import CommandSummary from './views/CommandSummary.vue';
import Editor from './views/Editor.vue';
import IncomeStatement from './views/IncomeStatement.vue';
import IrrDetail from './views/IrrDetail.vue';
import IrrSummary from './views/IrrSummary.vue';
import Journal from './views/Journal.vue';
import MyLayout from './views/MyLayout.vue';
import Prices from './views/Prices.vue';

import './plugins/element.js';
Vue.prototype.$notify = Notification;

const routes: RouteConfig[] = [
  {path: '/balance_sheet', component: BalanceSheet, meta: {title: 'Balance Sheet'}},
  {path: '/income_statement', component: IncomeStatement, meta: {title: 'Income Statement'}},
  {path: '/journal', component: Journal, meta: {title: 'Journal'}},
  {path: '/prices', component: Prices, meta: {title: 'Prices'}},
  {path: '/editor', component: Editor, meta: {title: 'Editor'}},
  {path: '/irr', component: IrrSummary, meta: {title: 'IRR'}},
  {path: '/irr/:accountId', component: IrrDetail, name: 'irr_detail', props: true},
  {path: '/account/:accountId', component: Account, name: 'account', props: true},
  {path: '/command/', component: CommandSummary, meta: {title: 'Commands'}},
  {path: '/command/:accountId', component: Command, name: 'command', props: true},
  {path: '/*', component: {template: '<div>Not yet implemented</div>'}},
];

const router = new VueRouter({
  routes,
});

router.afterEach((to, from) => {
  document.title = (to.meta.title || 'Gainstrack');
});

Vue.use(VueRouter);
Vue.use(Vuex);

import numeral from 'numeral';
Vue.filter('numeral', (value: any, format: string) => numeral(value).format(format));

store.dispatch('reload');

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
