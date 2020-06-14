import MyPage from 'src/components/MyPage.vue';
import {Notification} from 'element-ui';
import store from './store';
import router from './router';
import App from 'src/OrigApp.vue';
import Vue from 'vue';

Vue.prototype.$notify = Notification;

Vue.config.productionTip = false;

Vue.component('MyPage', MyPage);

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#q-app');
