import MyPage from '@/components/MyPage';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';

import 'element-ui/lib/theme-chalk/index.css';
import lang from 'element-ui/lib/locale/lang/en';
import locale from 'element-ui/lib/locale';

export default async ({ Vue }) => {
    Vue.component('MyPage', MyPage);

    Vue.prototype.$appVersion = version.version;

    locale.use(lang);

    LoadingBar.setDefaults({
        color: 'primary',
        size: '5px',
        position: 'bottom'
    })
}


