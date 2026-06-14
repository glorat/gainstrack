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
    await getRedirectResult(myAuth());
  } catch (err: unknown) {
    console.error('Google redirect sign-in failed:', (err as { message?: string }).message ?? err);
  }
});

onAuthStateChanged(myAuth(), async (user: User | null) => {
  if (user) {
    try {
      await store.loginWithToken(() => user.getIdToken(false));
    } catch (error) {
      console.error(error);
      await store.logout();
    }
    await store.changeUser(user);
  } else {
    await store.logout();
    await store.changeUser(undefined);
  }
});
</script>

<style scoped>

</style>
