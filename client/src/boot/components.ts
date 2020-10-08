import MyPage from '../components/MyPage.vue';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';

import Vue from 'vue';
import {boot} from 'quasar/wrappers';

export default boot(({ Vue }) => {
  Vue.component('MyPage', MyPage);

  LoadingBar.setDefaults({
    color: 'primary',
    size: '5px',
    position: 'bottom'
  })
})

declare module 'vue/types/vue' {
  interface Vue {
    $appVersion: string;
  }
}

Vue.prototype.$appVersion = version.version;
