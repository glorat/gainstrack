<template>
  <div id="app">
    <my-layout></my-layout>
  </div>
</template>

<style>

</style>
<script>
  const MyLayout = () => import ('@/views/MyLayout');

  // import MyLayout from '@/views/MyLayout';
  export default {
    components: {MyLayout}
  }
</script>
