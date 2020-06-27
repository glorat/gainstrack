<template>
  <my-page padding>
    <markdown-render :page="page"></markdown-render>
  </my-page>
</template>

<script lang="ts">
  import MarkdownRender from '../components/MarkdownRender.vue';
  import Vue from 'vue';

  export default Vue.extend({
    name: 'Markdown',
    props: ['page'],
    components: {MarkdownRender},
  });
</script>

<style scoped>

</style>
