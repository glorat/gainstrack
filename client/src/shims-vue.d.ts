// import { ComponentCustomProperties } from 'vue'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: any
  }
}
// Mocks all files ending in `.vue` showing them as plain Vue instances
// declare module '*.vue' {
//   import Vue from 'vue'
//   export default Vue
// }

/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
