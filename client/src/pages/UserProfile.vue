<template>
  <my-page padding>
    <h5>Public Profile</h5>
    <p>The following information is available publicly about your account</p>
    <div v-if="userRoles && userRoles.roles && userRoles.roles.admin">
      You are an administrator
    </div>
    <div v-if="userRoles && userRoles.displayName">
      You are known as {{ userRoles.displayName }}
    </div>
    <div v-else-if="firebaseAuthed">
      <q-input v-model="newDisplayName" label="Choose display name" hint="Your public display name can only be set once">
        <template v-slot:after>
          <q-btn round dense flat :icon="matLogin" @click="setDisplayName"/>
        </template>
      </q-input>
    </div>
    <h5>System information</h5>
    <p>The following information is what the system maintains to link to your data</p>
    <p v-if="firebaseUser">UID: {{ firebaseUser.uid }}</p>

    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from 'src/stores';
import { User } from 'firebase/auth';
import { getUserRole, setDisplayName as setDisplayNameFn } from 'src/lib/assetdb/assetDb';
import { DocumentData } from 'firebase/firestore';
import { matLogin } from '@quasar/extras/material-icons';
import { qnotify } from 'src/boot/notify';

const props = defineProps<{ id?: string }>();

const store = useAppStore();

const userRoles = ref<DocumentData | undefined>(undefined);
const loading = ref(false);
const newDisplayName = ref('');

const uid = computed<string | undefined>(() => {
  // Prop, else logged in user else nothing
  return props.id ?? firebaseUser.value?.uid;
});

const firebaseAuthed = computed<boolean>(() => !!store.user);

const firebaseUser = computed<User | undefined>(() => store.user);

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    if (uid.value) {
      userRoles.value = await getUserRole(uid.value);
    } else {
      userRoles.value = undefined;
    }
  }
  catch (e) {
    console.error(e);
  }
  finally {
    loading.value = false;
  }
}

async function setDisplayName() {
  try {
    loading.value = true;
    const result = await setDisplayNameFn(newDisplayName.value) as any;
    if (result?.message) qnotify.success(result.message);
    refresh();
  }
  catch (error) {
    const e: any = error;
    qnotify.error(e?.message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => { refresh(); });
</script>

<style scoped>

</style>
