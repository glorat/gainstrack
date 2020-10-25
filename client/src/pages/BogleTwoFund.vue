<template>
  <iframe src="play/index.html" class="myframe"></iframe>
</template>

<script lang="ts">
  import {defineComponent} from '@vue/composition-api';

  export default defineComponent({
    name: 'BogleTwoFund'
  })
</script>

<style scoped>
  .myframe {
    display: block;
    width: 100%;
    height: 100vh;
    border: none;
  }
</style>
