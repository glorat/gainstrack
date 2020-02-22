import {Notification} from 'element-ui';
import store from './store';
import router from './router';
import App from './App.vue';
import Vue from 'vue';

Vue.prototype.$notify = Notification;

// Get some state on startup
store.dispatch('reload');

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#q-app');
