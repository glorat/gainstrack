<template>
  <div id="q-app">
    <my-layout></my-layout>
  </div>
</template>

<style>

</style>
<script>
  const MyLayout = () => import ('@/pages/MyLayout');

  // import MyLayout from '@/pages/MyLayout';
  export default {
    components: {MyLayout}
  }
</script>
