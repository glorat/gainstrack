import axios from 'axios'
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

declare module 'vue' {
  interface ComponentCustomProperties {
    $notify: MyNotify
  }
}

export function axiosErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return String(error)
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && 'message' in data) return String((data as Record<string, unknown>)['message'])
  if (data) return JSON.stringify(data)
  return error.message
}

export default boot(({app}) => {
  app.config.globalProperties.$notify = qnotify
})
