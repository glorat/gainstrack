import CommandSummary from '../pages/CommandSummary.vue';
import Editor from '../pages/Editor.vue';
import IncomeStatement from '../pages/IncomeStatement.vue';
import IrrDetail from '../pages/IrrDetail.vue';
import IrrSummary from '../pages/IrrSummary.vue';
import Journal from '../pages/Journal.vue';
import Prices from '../pages/Prices.vue';
import { matAddCircleOutline, matEdit } from '@quasar/extras/material-icons';
import {RouteConfig} from 'vue-router';
import Markdown from 'pages/Markdown.vue';
import Assets from 'pages/Assets.vue';
import BalanceSheet from 'pages/BalanceSheet.vue';
import Quotes from 'pages/Quotes.vue';
import Settings from 'pages/Settings.vue';
import SourceErrors from 'components/SourceErrors.vue';
import Port from 'pages/Port.vue';
import History from 'pages/History.vue';
import Command from 'pages/Command.vue';
import AssetAllocation from 'pages/AssetAllocation.vue';
import Add from 'pages/Add.vue';
import AddCmd from 'pages/AddCmd.vue';
import PnlExplainDetail from 'pages/PnlExplainDetail.vue';
import Account from 'pages/Account.vue';

const routes: RouteConfig[] = [
  {path: '/add', component: Add, meta: {title: 'Add Record', icon: matAddCircleOutline}},
  {path: '/add/cmd', name: 'addcmd', component: AddCmd, meta: {title: 'Add Record'}},
  {
    path: '/balance_sheet',
    component: BalanceSheet,
    meta: {title: 'Balances'}
  },
  {
    path: '/assets',
    component: Assets,
    meta: {title: 'Assets'}
  },
  {path: '/income_statement', component: IncomeStatement, meta: {title: 'Income Statement'}},
  {path: '/journal', component: Journal, meta: {title: 'Journal'}},
  {path: '/prices', component: Prices, meta: {title: 'Trade Prices'}},
  {path: '/quotes', component: Quotes, meta: {title: 'Market Prices'}},
  {path: '/settings', component: Settings, meta: {title: 'Settings'}},
  {path: '/editor', component: Editor, meta: {title: 'Editor'}},
  {
    path: '/errors',
    name: 'errors',
    component: SourceErrors,
    meta: {title: 'Editor'}
  },
  {
    path: '/port',
    component: Port,
    meta: {title: 'Import/Export'},
  },
  {
    path: '/history',
    component: History,
    meta: {title: 'History'},
  },
  {path: '/irr', component: IrrSummary, meta: {title: 'IRR'}},
  {path: '/irr/:accountId', component: IrrDetail, name: 'irr_detail', props: true},
  {
    path: '/account/:accountId', component: Account,
    name: 'account', props: true,
    meta: {title: 'Account'}
  },
  {path: '/command', component: CommandSummary, meta: {title: 'Accounts', icon: matEdit}},
  {path: '/command/:accountId', component: Command, name: 'command', props: true},
  {
    path: '/aa',
    component: AssetAllocation,
    name: 'aa',
    meta: {title: 'Asset Allocation'}
  },
  {path: '/pnlexplain', component: () => import(/* webpackChunkName: "PnlDetail" */ '../pages/PnlExplain.vue'), meta: {title: ' P&L Explain'}},
  {path: '/pnlexplain/:fromDate/:toDate', component: PnlExplainDetail,
    name: 'pnldetail', meta: {title: ' P&L Explain'}, props: true},
  {path: '/help', component: Markdown,
    props: {page: 'help.md'},  meta: {title: 'Help'}},
  {path: '/faq', component: Markdown,
    props: {page: 'faq.md'},  meta: {title: 'FAQ'}},
  {path: '/*', component: Markdown,
    props: {page: 'welcome.md'},  meta: {title: 'Welcome'}},
];

export default routes;
