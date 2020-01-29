import {Notification} from 'element-ui';
import store from './store';
import router from './router';
import App from './App.vue';
import Vue from 'vue';

// Import the plugin here
import {Auth0Plugin} from './auth';

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
