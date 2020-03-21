import MyPage from '@/components/MyPage';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';

import 'element-ui/lib/theme-chalk/index.css';

export default async ({ Vue }) => {
    Vue.component('MyPage', MyPage);

    Vue.prototype.$appVersion = version.version;

    LoadingBar.setDefaults({
        color: 'primary',
        size: '5px',
        position: 'bottom'
    })
}


