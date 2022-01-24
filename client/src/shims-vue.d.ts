/* eslint-disable */
// This line MUST exist or 'vue' imports blow up
import {Store} from 'vuex';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: any
  }
}
