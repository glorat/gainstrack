import { Notify } from 'quasar';
import Vue from 'vue';

const qnotify = {
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
Vue.prototype.$notify = qnotify;


