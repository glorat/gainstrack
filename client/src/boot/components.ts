import MyPage from '../components/MyPage.vue';
import { LoadingBar } from 'quasar'

import version from '../../VERSION.json';
import {boot} from 'quasar/wrappers';
import {Auth0Plugin} from '../auth';

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

  // Import the plugin here
  app.use(Auth0Plugin, {
    domain: process.env.VUE_APP_AUTH0_ID + '.auth0.com',
    clientId: process.env.VUE_APP_AUTH0_CLIENT,
    audience: process.env.VUE_APP_AUTH0_AUDIENCE,
    // lint-ignore
    // onRedirectCallback: appState => {
    //   router.push(
    //       appState && appState.targetUrl
    //           ? appState.targetUrl
    //           : window.location.pathname
    //   );
    // }
  });

})

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $appVersion: string
  }
}

