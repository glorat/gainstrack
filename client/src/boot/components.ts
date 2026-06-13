import MyPage from '../components/MyPage.vue';
import { LoadingBar } from 'quasar'

import version from '../../package.json';
import {boot} from 'quasar/wrappers';

export default boot(({app}) => {
  // FIXME: globally register MyPage
  app.component('MyPage', MyPage)
  // defineComponent('MyPage', MyPage);

  LoadingBar.setDefaults({
    color: 'primary',
    size: '5px',
    position: 'bottom'
  })

  app.config.globalProperties.$appVersion = version.version
})

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $appVersion: string
  }
}

