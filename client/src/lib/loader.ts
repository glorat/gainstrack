import { defineAsyncComponent } from 'vue'

/* These are imports of components that should be lazy loaded and webchunked */

export const VuePlotly = defineAsyncComponent(() => import(/* webpackChunkName: "Plotly" */'../components/Plotly.vue'));
export const MyFirebase = defineAsyncComponent(() => import(/* webpackChunkName: "MyFirebase" */'../MyFirebase.vue'));
export const MarkdownRender = defineAsyncComponent(() => import(/* webpackChunkName: "MarkdownRender" */ '../components/MarkdownRender.vue'));
export const Tour = defineAsyncComponent(() => import (/* webpackChunkName: "Tour" */ '../Tour.vue'));
export const codemirror = defineAsyncComponent(() => import (/* webpackChunkName: "CodeMirror" */  '../components/CodeMirror.vue'));
export const FirebaseLogin = defineAsyncComponent(() => import(/* webpackChunkName: "FirebaseLogin" */ '../components/FirebaseLogin.vue'));
export const PnlExplain = defineAsyncComponent(() => import(/* webpackChunkName: "PnlExplain" */ '../pages/PnlExplain.vue'));
