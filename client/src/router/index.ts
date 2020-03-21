import Vue from 'vue';
import Router, {RouteConfig} from 'vue-router';
import routes from './config';
Vue.use(Router);

const router = new Router({
    routes
});

router.afterEach((to, from) => {
    document.title = (to.meta.title || 'Gainstrack');
});

export default router;
