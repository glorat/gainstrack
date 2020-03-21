import MyPage from '@/components/MyPage.vue';
import {Notification} from 'element-ui';
import store from './store';
import router from './router';
import App from './OrigApp.vue';
import Vue from 'vue';

Vue.prototype.$notify = Notification;

Vue.config.productionTip = false;

Vue.component('MyPage', MyPage);

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#q-app');
