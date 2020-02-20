import Vue from 'vue';
import {Store} from 'vuex';

declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

import {Tour} from 'vue-tour';

declare module "vue/types/vue" {
  interface Vue {
    $tours: Record<string, Tour>;
  }
}
