import { Notify } from 'quasar';
import Vue from 'vue';

interface MyNotify {
  success(msg: string): void
  error(msg: string): void
  warning(msg: string): void
}

const qnotify: MyNotify = {
    success(msg) {
        Notify.create({
            type: 'positive',
            message: msg,
        })
    },
    error(msg) {
        Notify.create({
            type: 'negative',
            message: msg,
        })
    },
    warning(msg) {
        Notify.create({
            type: 'warning',
            message: msg,
        })
    }
};

// declare module 'vue/types/vue' {
//   interface Vue {
//     $notify: MyNotify;
//   }
// }

Vue.prototype.$notify = qnotify;


