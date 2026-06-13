<template>
  <div></div>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import { myAnalytics, myAuth } from 'src/lib/assetdb/myfirebase';
  import { onAuthStateChanged, User } from 'firebase/auth';
  import { logEvent } from 'firebase/analytics';
  import {useAppStore} from 'src/stores';

  export default defineComponent({
    name: 'MyFirebase',
    setup() {
      const store = useAppStore()
      return { store }
    },
    created(): void {
      const store = this.store
      this.$router.afterEach((to) => {
        logEvent(myAnalytics(), 'page_view', {page_path: to.path})
      });
      onAuthStateChanged(myAuth(), async (user: User | null) => {
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
