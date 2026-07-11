<template>
  <div></div>
</template>

<script setup lang="ts">
import { myAnalytics, myAuth } from 'src/lib/assetdb/myfirebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { logEvent } from 'firebase/analytics';
import { useAppStore } from 'src/stores';
import { useRouter } from 'vue-router';

const store = useAppStore();
const router = useRouter();

router.afterEach(to => {
  logEvent(myAnalytics(), 'page_view', { page_path: to.path });
});

onAuthStateChanged(myAuth(), async (user: User | null) => {
  if (user) {
    console.log(`[auth] signed in: uid=${user.uid} email=${user.email}`);
    store.changeUser(user);
    try {
      await store.loginWithToken(() => user.getIdToken(false));
      console.log('[auth] backend session established');
    } catch (error) {
      console.error('[auth] loginWithToken failed:', error);
    }
  } else {
    console.log('[auth] signed out');
    store.changeUser(undefined);
  }
});
</script>

<style scoped>

</style>
