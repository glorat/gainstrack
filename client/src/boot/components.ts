import MyPage from '../components/MyPage.vue';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';

import 'element-ui/lib/theme-chalk/index.css';
import lang from 'element-ui/lib/locale/lang/en';
import locale from 'element-ui/lib/locale';
import Vue from 'vue';
import {boot} from 'quasar/wrappers';

export default boot(({ Vue }) => {
  Vue.component('MyPage', MyPage);

  locale.use(lang);

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
