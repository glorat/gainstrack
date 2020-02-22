import {Notification} from 'element-ui';
import store from './store';
import router from './router';
import App from './App.vue';
import Vue from 'vue';

// Import the plugin here
import {Auth0Plugin} from './auth';

import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';

const sentryIntegration = (process.env.NODE_ENV === 'development') ? [] : [new Integrations.Vue({
  Vue,
  attachProps: true,
  logErrors: 'true' === process.env.VUE_APP_SENTRY_LOG_ERRORS
})];

Sentry.init({
  dsn: 'https://842809e35b06430997c7e8d9ad5ac592@sentry.io/2041653',
  environment: process.env.NODE_ENV,
  release: 'gainstrack@' + process.env.VUE_APP_VERSION,
  integrations: sentryIntegration,
});

Vue.use(Auth0Plugin, {
  domain: process.env.VUE_APP_AUTH0_ID + '.auth0.com',
  clientId: process.env.VUE_APP_AUTH0_CLIENT,
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  // @ts-ignore
  // onRedirectCallback: appState => {
  //   router.push(
  //       appState && appState.targetUrl
  //           ? appState.targetUrl
  //           : window.location.pathname
  //   );
  // }
});


Vue.prototype.$notify = Notification;

// Get some state on startup
store.dispatch('reload');

Vue.config.productionTip = false;

import VueTour from 'vue-tour'
// tslint:disable-next-line
require('vue-tour/dist/vue-tour.css');
Vue.use(VueTour);

import * as firebase from 'firebase/app';

// Add the Firebase services that you want to use
import 'firebase/analytics';
const firebaseConfig = {
  apiKey: 'AIzaSyCeQ9DEdajlDGPxz1yLYnnn51AtS671ZPA',
  authDomain: 'gainstrack-poc.firebaseapp.com',
  databaseURL: 'https://gainstrack-poc.firebaseio.com',
  projectId: 'gainstrack-poc',
  storageBucket: 'gainstrack-poc.appspot.com',
  messagingSenderId: '975553518995',
  appId: '1:975553518995:web:ef5ae5f93fbc0295131c66',
  measurementId: 'G-KGML8QWTGL'
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
Vue.prototype.$analytics = firebase.analytics();

router.afterEach(( to, from ) => {
  Vue.prototype.$analytics.logEvent('page_view', {page_path: to.path})
});


new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#q-app');
