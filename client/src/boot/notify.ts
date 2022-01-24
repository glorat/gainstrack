import { Notify } from 'quasar';
import {createApp} from 'vue';

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

// declare module '@vue/runtime-core' {
//   interface ComponentCustomProperties {
//     $notify: MyNotify;
//   }
// }


const app = createApp({})
app.config.globalProperties.$notify = qnotify


