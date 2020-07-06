/* These are imports of components that should be lazy loaded and webchunked */

export const VuePlotly = () => import(/* webpackChunkName: "Plotly" */'../components/Plotly.vue');
export const MySentry = () => import(/* webpackChunkName: "MySentry" */ '../MySentry.vue');
export const MyFirebase = () => import(/* webpackChunkName: "MyFirebase" */'../MyFirebase.vue');
export const MarkdownRender = () => import(/* webpackChunkName: "MarkdownRender" */ '../components/MarkdownRender.vue');
export const Tour = () => import (/* webpackChunkName: "Tour" */ '../Tour.vue');
export const codemirror = () => import (/* webpackChunkName: "CodeMirror" */  '../components/CodeMirror.vue');
