import CommandSummary from '../pages/CommandSummary.vue';
import Editor from '../pages/Editor.vue';
import IncomeStatement from '../pages/IncomeStatement.vue';
import IrrDetail from '../pages/IrrDetail.vue';
import IrrSummary from '../pages/IrrSummary.vue';
import Journal from '../pages/Journal.vue';
import Prices from '../pages/Prices.vue';
import {matAccountBalance, matAddCircleOutline, matEdit, matHome} from '@quasar/extras/material-icons';
import {RouteRecordRaw} from 'vue-router';
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
import BogleTools from 'pages/BogleTools.vue';
import BogleTwoFund from 'pages/BogleTwoFund.vue';
import RebalanceCalc from 'components/RebalanceCalc.vue';
import Login from 'pages/Login.vue';
import UserProfile from 'pages/UserProfile.vue';
import ForecastView from 'components/forecast/ForecastView.vue';
import {AsyncComponentLoader} from '@vue/runtime-core';

const commonRoutes: RouteRecordRaw[] = [
  {path: '/assetdb', meta: {title:'Asset DB'}, component: () => import('../pages/AssetDb.vue')},
  {path: '/quotesdb/new', name: 'quoteSourceNew', meta: {title: 'Quotes DB'}, component: () => import('../pages/QuoteSource.vue')},
  {path: '/quotesdb/:id', name: 'quoteSource', meta: {title: 'Quotes DB'}, props: true, component: () => import('../pages/QuoteSource.vue')},
  {path: '/login', component: Login,  meta: {title: 'Login'}},
  {path: '/user_profile', component: UserProfile, meta: {title: 'User Profile'}, props: true},
  {path: '/user_profile/:id', name: 'userProfile', component: UserProfile, meta: {title: 'User Profile'}, props: true},
];

const gainstrackRoutes: RouteRecordRaw[] = [
  ...commonRoutes,
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
    meta: {title: 'Assets', icon: matAccountBalance}
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
  {path: '/rebalance/:accountId', component: RebalanceCalc, name: 'rebalance', props: true},
  {path: '/command', component: CommandSummary, meta: {title: 'Accounts', icon: matEdit}},
  {path: '/command/:accountId', component: Command, name: 'command', props: true},
  {
    path: '/aa',
    component: AssetAllocation,
    name: 'aa',
    meta: {title: 'Asset Allocation'}
  },
  {path: '/pnlexplain', component: () => import(/* webpackChunkName: "PnlExplain" */ '../pages/PnlExplain.vue'), meta: {title: ' P&L Explain'}},
  {path: '/pnlexplain/:fromDate/:toDate', component: PnlExplainDetail,
    name: 'pnldetail', meta: {title: ' P&L Explain'}, props: true},
  {path: '/help', component: Markdown,
    props: {page: 'help.md'},  meta: {title: 'Help'}},
  {path: '/releases', component: Markdown,
    props: {page: 'releases.md'},  meta: {title: 'Release Notes'}},
  {path: '/faq', component: Markdown,
    props: {page: 'faq.md'},  meta: {title: 'FAQ'}},
  {path: '/*', component: Markdown,
    props: {page: 'welcome.md'},  meta: {title: 'Welcome'}},
];

const gainstrackNavBar = [
  ['assets', 'command'],
  ['balance_sheet', 'income_statement', 'journal'],
  ['pnlexplain', 'irr', 'aa'],
  ['prices', 'quotes', 'settings', 'user_profile', 'assetdb'],
  ['port', 'editor', 'add', 'history'],
  ['help', 'faq', 'releases']
];

const gainstrackMode = {
  appTitle: 'Gainstrack',
  appDescription: 'Gainstrack Wealth',
  appRoutes: gainstrackRoutes,
  navBar: gainstrackNavBar,
  layout: () => import(/* webpackChunkName: "GainstrackCom" */ '../layouts/GainstrackCom.vue')
};

const simpleRoutes: RouteRecordRaw[] = [
  ...commonRoutes,
  // boglebot.com specific routes
  {path: '/play', component: BogleTwoFund,
    meta: {title: '2-Fund Guide', icon: 'img:icons/boglebot.svg'}
    },
  {path: '/investments', component: Account, props:{accountId: 'Assets:Investment'},
    meta: {title: 'Investment Assets'}
    },
  {path: '/contribute', component: RebalanceCalc, props:{accountId: 'Assets:Investment'}, meta: {title: 'Contribution Calculator'}, name: 'rebalance'},
  {path: '/forecast', component: ForecastView, meta: {title: 'Retirement Target Forecast'}},
  {path: '/', component: BogleTools, meta: {title: 'Boglebot Home', icon: matHome}},
  {path: '/*', component: BogleTools},
  ];
const simpleNavBar: string[][] = [
  [''],
  ['play'],
  ['investments', 'contribute', 'forecast'],
  ['assetdb'],
  ['user_profile'],
];

const simpleMode: AppMode =
  {
    appTitle: 'Boglebot',
    appDescription: 'Free tools to help Bogleheads implement low-cost index fund portfolios',
    appRoutes: simpleRoutes,
    navBar: simpleNavBar,
    layout: () => import(/* webpackChunkName: "BoglebotCom" */ '../layouts/BoglebotCom.vue')
  }

interface AppMode {
  appRoutes:RouteRecordRaw[]
  navBar: string[][]
  layout: AsyncComponentLoader
  appTitle: string
  appDescription: string
}

export const {appRoutes, navBar, layout, appTitle, appDescription} : AppMode = (() => {
  const host = window.location.hostname;
  if (host.match('gainstrack')) {
    return gainstrackMode;
  } else if (host.match('boglebot')) {
    return simpleMode;
  } else {
    // Default to gainstrack for unknown host
    // Can change this during development. Should not hit this in production
    return gainstrackMode;

  }
})()

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: layout,
    children: appRoutes
  }
]

export default routes;
