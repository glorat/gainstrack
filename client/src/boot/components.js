import MyPage from '@/components/MyPage';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';

export default async ({ Vue }) => {
    Vue.component('MyPage', MyPage);
    console.error(version);
    Vue.prototype.$appVersion = version.version;

    LoadingBar.setDefaults({
        color: 'primary',
        size: '5px',
        position: 'bottom'
    })
}


