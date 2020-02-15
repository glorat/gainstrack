<template>
  <div id="q-app">
    <tour></tour>
    <my-layout></my-layout>

  </div>
</template>

<style>

</style>
<script>
  import Tour from '@/Tour';

  const MyLayout = () => import ('@/pages/MyLayout');

  // import MyLayout from '@/pages/MyLayout';
  export default {
    components: {MyLayout, Tour}
  }
</script>
