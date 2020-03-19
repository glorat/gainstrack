<template>
  <div id="q-app">
      <my-q-layout></my-q-layout>
    <my-sentry></my-sentry>
    <my-firebase></my-firebase>
  </div>
</template>

<style>

</style>

<script>
  import MyQLayout from './pages/MyQLayout';
  const MySentry = () => import ('@/MySentry');
  const MyFirebase = () => import ('@/MyFirebase');
  // import MyLayout from '@/pages/MyLayout';
  export default {
    components: { MyQLayout, MySentry, MyFirebase}
  }
</script>
