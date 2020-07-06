<template>
  <my-page padding>
    <markdown-render :page="page"></markdown-render>
  </my-page>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {MarkdownRender} from 'src/lib/loader';

  export default Vue.extend({
    name: 'Markdown',
    props: ['page'],
    components: {MarkdownRender},
  });
</script>

<style scoped>

</style>
