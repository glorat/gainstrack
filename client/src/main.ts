import {Notification} from 'element-ui';
import store from './store';
import router from './router';
import App from './App.vue';
import Vue from 'vue';

// Import the plugin here
import {Auth0Plugin} from './auth';

import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';

Sentry.init({
  dsn: 'https://842809e35b06430997c7e8d9ad5ac592@sentry.io/2041653',
  integrations: [new Integrations.Vue({
    Vue,
    attachProps: true,
    logErrors: 'true' === process.env.VUE_APP_SENTRY_LOG_ERRORS
  })],
});

Vue.use(Auth0Plugin, {
  domain: process.env.VUE_APP_AUTH0_ID + '.auth0.com',
  clientId: process.env.VUE_APP_AUTH0_CLIENT,
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  // @ts-ignore
  onRedirectCallback: appState => {
    router.push(
        appState && appState.targetUrl
            ? appState.targetUrl
            : window.location.pathname
    );
  }
});


Vue.prototype.$notify = Notification;

// Get some state on startup
store.dispatch('reload');

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#q-app');
