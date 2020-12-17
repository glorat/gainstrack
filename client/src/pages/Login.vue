<template>
  <my-page padding>
    <firebase-login></firebase-login>
  </my-page>
</template>

<script>
import {defineComponent} from '@vue/composition-api';
import {FirebaseLogin} from '../lib/loader';

export default defineComponent({
  name: 'Login',
  components: {FirebaseLogin},
})
</script>

<style scoped>

</style>
