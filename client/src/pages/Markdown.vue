<template>
  <my-page padding>
    <markdown-render :page="page"></markdown-render>
  </my-page>
</template>

<script setup lang="ts">
import {MarkdownRender} from 'src/lib/loader';

defineProps<{ page: string }>();
</script>

<style scoped>

</style>
