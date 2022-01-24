<template>
  <my-page padding>
    <markdown-render :page="page"></markdown-render>
  </my-page>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import {MarkdownRender} from 'src/lib/loader';

  export default defineComponent({
    name: 'Markdown',
    props: ['page'],
    components: {MarkdownRender},
  });
</script>

<style scoped>

</style>
