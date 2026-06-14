<template>
  <div></div>
</template>

<script setup lang="ts">
import { myAnalytics, myAuth } from 'src/lib/assetdb/myfirebase';
import { onAuthStateChanged, getRedirectResult, User } from 'firebase/auth';
import { logEvent } from 'firebase/analytics';
import { useAppStore } from 'src/stores';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

const store = useAppStore();
const router = useRouter();

router.afterEach(to => {
  logEvent(myAnalytics(), 'page_view', { page_path: to.path });
});

onMounted(async () => {
  try {
    const result = await getRedirectResult(myAuth());
    console.log('[auth] getRedirectResult:', result ? `user=${result.user.email}` : 'null');
  } catch (err: unknown) {
    console.error('[auth] getRedirectResult error:', (err as { code?: string; message?: string }));
  }
});

onAuthStateChanged(myAuth(), async (user: User | null) => {
  if (user) {
    console.log(`[auth] signed in: uid=${user.uid} email=${user.email}`);
    try {
      await store.loginWithToken(() => user.getIdToken(false));
      console.log('[auth] backend session established');
      await store.changeUser(user);
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
