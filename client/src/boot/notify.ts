import { Notify } from 'quasar';
import {boot} from 'quasar/wrappers';

interface MyNotify {
  success(msg: string): void
  error(msg: string): void
  warning(msg: string): void
}

export const qnotify: MyNotify = {
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

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $notify: any
  }
}

export default boot(({app}) => {
  app.config.globalProperties.$notify = qnotify
})
