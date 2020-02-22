import Vue from 'vue';
import {Store} from 'vuex';
import firebase from 'firebase';

declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

import {Tour} from 'vue-tour';

declare module "vue/types/vue" {

  interface Vue {
    $tours: Record<string, Tour>;

    $analytics: firebase.analytics.Analytics
  }
}
