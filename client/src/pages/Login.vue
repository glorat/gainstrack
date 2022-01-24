<template>
  <my-page padding>
    <firebase-login></firebase-login>
  </my-page>
</template>

<script>
import {FirebaseLogin} from '../lib/loader';
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Login',
  components: {FirebaseLogin},
})
</script>

<style scoped>

</style>
