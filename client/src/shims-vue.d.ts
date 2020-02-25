import Vue from 'vue';
import {Store} from 'vuex';
import firebase from 'firebase';

declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

declare module "vue/types/vue" {

  interface Vue {
    $analytics: firebase.analytics.Analytics
  }
}
