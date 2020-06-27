<template>
  <my-page padding>
    <div>
      <h5>Asset configuration</h5>
      <assets-editor></assets-editor>
    </div>
  </my-page>
</template>

<script lang="ts">
  import AssetsEditor from '../components/AssetsEditor.vue';

  export default {
    name: 'Settings',
    components: {AssetsEditor},
    computed: {}
  }
</script>

<style scoped>

</style>
