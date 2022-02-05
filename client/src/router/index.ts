import { route } from 'quasar/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory, Router,
} from 'vue-router';
import {MyState} from '../store'
import routes, { appTitle, appDescription } from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation
 */

export let router: Router;

export default route<MyState>(function(/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);



  router = createRouter({
    scrollBehavior: () => ({left: 0, top: 0}),
    routes,


    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    // mode: process.env.VUE_ROUTER_MODE,
    // base: process.env.VUE_ROUTER_BASE,

    history: createHistory(
      process.env.MODE==='ssr' ? void 0:process.env.VUE_ROUTER_BASE
    ),
  });

  router.afterEach((to) => {
    const title: string = to.meta['title']as string|undefined ?? appTitle
    document.title = title;
    const desc:string = to.meta['description'] as string|undefined?? appDescription
    document
      .getElementsByTagName('meta')
      .namedItem('description')?.setAttribute('content',desc)
  });
  return router
});
