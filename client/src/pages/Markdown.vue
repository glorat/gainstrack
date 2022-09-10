<template>
  <my-page padding>
    <markdown-render class="markdown" :page="page"></markdown-render>
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

<style>
/* Override quasar typography back to UA default sizes*/
.markdown h1 {
  font-size: 2em;
  font-weight: bold;
  line-height: initial;
  letter-spacing: initial;
}

.markdown h2 {
  font-size: 1.5em;
  font-weight: bold;
  line-height: initial;
  letter-spacing: initial;
}
.markdown h3 {
  font-size: 1.17em;
  font-weight: bold;
  line-height: initial;
  letter-spacing: initial;
}
.markdown h4 {
  font-size: initial;
  font-weight: bold;
  line-height: initial;
  letter-spacing: initial;
}

.markdown h5 {
  font-size: 0.83em;
  font-weight: bold;
  line-height: initial;
  letter-spacing: initial;
}
</style>
