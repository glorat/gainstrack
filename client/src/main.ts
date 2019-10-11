import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Account from './components/Account.vue';
import BalanceSheet from './components/views/BalanceSheet.vue';
import Command from './components/views/Command.vue';
import CommandSummary from './components/views/CommandSummary.vue';
import Editor from './components/views/Editor.vue';
import IncomeStatement from './components/views/IncomeStatement.vue';
import IrrDetail from './components/views/IrrDetail.vue';
import IrrSummary from './components/views/IrrSummary.vue';
import MyLayout from './components/views/MyLayout.vue';
import Prices from './components/views/Prices.vue';

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

const routes: RouteConfig[] = [
    {path: '/balance_sheet', component: BalanceSheet},
    {path: '/income_statement', component: IncomeStatement},
    {path: '/prices', component: Prices},
    {path: '/editor', component: Editor},
    {path: '/irr', component: IrrSummary},
    {path: '/irr/:accountId', component: IrrDetail, name: 'irr_detail', props: true},
    {path: '/account/:accountId', component: Account, name: 'account', props: true},
    {path: '/command/', component: CommandSummary},
    {path: '/command/:accountId', component: Command, name: 'command', props: true},
    {path: '/*', component: {template: '<div>Not yet implemented</div>'}},
];

const router = new VueRouter({
    routes,
});

Vue.use(VueRouter);
Vue.use(ElementUI);

import numeral from 'numeral';
Vue.filter('numeral', (value: any, format: string) => numeral(value).format(format));

const app = new Vue({
    el: '#app',
    template: '<my-layout></my-layout>',
    router,
    components: {MyLayout},
});
