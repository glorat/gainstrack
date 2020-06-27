<template>
  <div id="q-app">
    <my-layout></my-layout>
    <my-sentry></my-sentry>
    <my-firebase></my-firebase>
  </div>
</template>

<style>

</style>

<script>
import MyLayout from './pages/MyLayout'
const MySentry = () => import('./MySentry.vue')
const MyFirebase = () => import('./MyFirebase.vue')
// import MyLayout from '@/pages/MyLayout';
export default {
  components: { MyLayout, MySentry, MyFirebase }
}
</script>
