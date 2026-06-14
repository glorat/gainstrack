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
  console.log('[auth] onAuthStateChanged:', user ? `user=${user.email}` : 'null');
  if (user) {
    try {
      await store.loginWithToken(() => user.getIdToken(false));
      await store.changeUser(user);
    } catch (error) {
      console.error('[auth] loginWithToken failed:', error);
    }
  } else {
    store.changeUser(undefined);
  }
});
</script>

<style scoped>

</style>
