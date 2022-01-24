// import MyPage from '../components/MyPage.vue';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';

import {createApp} from 'vue';
import {boot} from 'quasar/wrappers';

export default boot(() => {
  // FIXME: globally register MyPage
  // defineComponent('MyPage', MyPage);

  LoadingBar.setDefaults({
    color: 'primary',
    size: '5px',
    position: 'bottom'
  })
})

const app = createApp({})
app.config.globalProperties.$appVersion = version.version

// declare module '@vue/runtime-core' {
//   interface ComponentCustomProperties {
//     appVersion: string
//   }
// }

