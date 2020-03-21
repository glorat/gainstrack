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
  import MyLayout from './pages/MyLayout';
  const MySentry = () => import ('@/MySentry');
  const MyFirebase = () => import ('@/MyFirebase');
  // import MyLayout from '@/pages/MyLayout';
  export default {
    components: { MyLayout, MySentry, MyFirebase}
  }
</script>
