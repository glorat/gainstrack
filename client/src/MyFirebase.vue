<template>
  <div></div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {myAnalytics} from 'src/lib/myfirebase';

  export default Vue.extend({
    name: 'MyFirebase',

    created(): void {
      this.$router.afterEach((to) => {
        myAnalytics().logEvent('page_view', {page_path: to.path})
      });
    }
  })

</script>

<style scoped>

</style>
