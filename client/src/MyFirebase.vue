<template>
  <div></div>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import {myfirebase} from 'src/lib/assetdb';
  import myAnalytics = myfirebase.myAnalytics;
  import myAuth = myfirebase.myAuth;
  import {useAppStore} from 'src/stores';
  import firebase from 'firebase/compat/app';

  export default defineComponent({
    name: 'MyFirebase',
    setup() {
      const store = useAppStore()
      return { store }
    },
    created(): void {
      const store = this.store
      this.$router.afterEach((to) => {
        myAnalytics().logEvent('page_view', {page_path: to.path})
      });
      myAuth().onAuthStateChanged(async (user: firebase.User | null) => {
        if (user) {
          try {
            await store.loginWithToken(() => user.getIdToken(false))
          } catch (error) {
            console.error(error);
            await store.logout();
          }
          await store.changeUser(user)
        } else {
          await store.logout();
          await store.changeUser(undefined)
        }
      })
    }
  })
</script>

<style scoped>

</style>
