import CommandSummary from '@/pages/CommandSummary.vue';
import Editor from '@/pages/Editor.vue';
import IncomeStatement from '@/pages/IncomeStatement.vue';
import IrrDetail from '@/pages/IrrDetail.vue';
import Journal from '@/pages/Journal.vue';
import Prices from '@/pages/Prices.vue';
import {RouteConfig} from 'vue-router';

const routes: RouteConfig[] = [
    {path: '/add', component: () => import('../pages/Add.vue'), meta: {title: 'Add Record', icon: 'add_circle_outline'}},
    {path: '/add/cmd', name: 'addcmd', component: () => import('../pages/AddCmd.vue'), meta: {title: 'Add Record'}},
    {
        path: '/balance_sheet',
        component: () => import(/* webpackChunkName: "BalanceSheet" */ '../pages/BalanceSheet.vue'),
        meta: {title: 'Balance Sheet'}
    },
    {path: '/income_statement', component: IncomeStatement, meta: {title: 'Income Statement'}},
    {path: '/journal', component: Journal, meta: {title: 'Journal'}},
    {path: '/prices', component: Prices, meta: {title: 'Prices'}},
    {path: '/quotes', component: () => import('../pages/Quotes.vue'), meta: {title: 'Market Quotes'}},
    {path: '/settings', component: () => import('../pages/Settings.vue'), meta: {title: 'Settings'}},
    {path: '/editor', component: Editor, meta: {title: 'Editor'}},
    {
        path: '/errors',
        name: 'errors',
        component: () => import('../components/SourceErrors.vue'),
        meta: {title: 'Editor'}
    },
    {
        path: '/port',
        component: () => import('../pages/Port.vue'),
        meta: {title: 'Import/Export'},
    },
    {
        path: '/history',
        component: () => import('../pages/History.vue'),
        meta: {title: 'History'},
    },
    {path: '/irr', component: () => import('../pages/IrrSummary.vue'), meta: {title: 'IRR'}},
    {path: '/irr/:accountId', component: IrrDetail, name: 'irr_detail', props: true},
    {
        path: '/account/:accountId', component: () => import(/* webpackChunkName: "Account" */ '../pages/Account.vue'),
        name: 'account', props: true,
        meta: {title: 'Account'}
    },
    {path: '/command', component: CommandSummary, meta: {title: 'Accounts', icon: 'edit'}},
    {path: '/command/:accountId', component: () => import('../pages/Command.vue'), name: 'command', props: true},
    {
        path: '/aa',
        component: () => import('@/pages/AssetAllocation.vue'),
        name: 'aa',
        meta: {title: 'Asset Allocation'}
    },
    {path: '/pnlexplain', component: () => import('../pages/PnlExplain.vue'), meta: {title: ' P&L Explain'}},
    {path: '/pnlexplain/:fromDate/:toDate', component: () => import('../pages/PnlExplainDetail.vue'),
        name: 'pnldetail', meta: {title: ' P&L Explain'}, props: true},
    {path: '/help', component: () => import('../pages/Markdown.vue'),
        props: {page: 'help.md'},  meta: {title: 'Help'}},
    {path: '/faq', component: () => import('../pages/Markdown.vue'),
        props: {page: 'faq.md'},  meta: {title: 'FAQ'}},
    {path: '/*', component: () => import('../pages/Markdown.vue'),
        props: {page: 'welcome.md'},  meta: {title: 'Welcome'}},
];

export default routes;
