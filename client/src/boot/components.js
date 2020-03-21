import MyPage from '@/components/MyPage';

import version from '../../VERSION.json';

export default async ({ Vue }) => {
    Vue.component('MyPage', MyPage);
    console.error(version);
    Vue.prototype.$appVersion = version.version;
}
