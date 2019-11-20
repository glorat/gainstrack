import {Notification} from 'element-ui';
import store from './store';
import App from './App.vue';
import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Vuex from 'vuex';
import CommandSummary from './pages/CommandSummary.vue';
import Editor from './pages/Editor.vue';
import IncomeStatement from './pages/IncomeStatement.vue';
import IrrDetail from './pages/IrrDetail.vue';
import Journal from './pages/Journal.vue';
import Prices from './pages/Prices.vue';

Vue.prototype.$notify = Notification;

const routes: RouteConfig[] = [
  {path: '/balance_sheet', component: () => import(/* webpackChunkName: "BalanceSheet" */ './pages/BalanceSheet.vue'),
    meta: {title: 'Balance Sheet'}},
  {path: '/income_statement', component: IncomeStatement, meta: {title: 'Income Statement'}},
  {path: '/journal', component: Journal, meta: {title: 'Journal'}},
  {path: '/prices', component: Prices, meta: {title: 'Prices'}},
  {path: '/editor', component: Editor, meta: {title: 'Editor'}},
  {path: '/errors', component: () => import('./components/SourceErrors.vue'), meta: {title: 'Editor'}},
  {path: '/irr', component: () => import('./pages/IrrSummary.vue'), meta: {title: 'IRR'}},
  {path: '/irr/:accountId', component: IrrDetail, name: 'irr_detail', props: true},
  {path: '/account/:accountId', component: () => import(/* webpackChunkName: "Account" */ './pages/Account.vue'),
    name: 'account', props: true},
  {path: '/command/', component: CommandSummary, meta: {title: 'Commands'}},
  {path: '/command/:accountId', component: () => import('./pages/Command.vue'), name: 'command', props: true},
  {path: '/aa', component: () => import('./pages/AssetAllocation.vue'), name: 'aa', meta: {title: 'Asset Allocati'}},
  {path: '/*', component: () => import('./pages/Help.vue'), name: 'help'},
];

const router = new VueRouter({
  routes,
});

router.afterEach((to, from) => {
  document.title = (to.meta.title || 'Gainstrack');
});

Vue.use(VueRouter);
Vue.use(Vuex);

store.dispatch('reload');

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
