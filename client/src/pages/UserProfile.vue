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

<script lang="ts">
  import {defineComponent} from 'vue';
  import {useAppStore} from 'src/stores';
  import { User } from 'firebase/auth';
  import {getUserRole, setDisplayName} from 'src/lib/assetdb/assetDb';
  import {DocumentData} from  'firebase/firestore';
  import {matLogin} from '@quasar/extras/material-icons';
  export default defineComponent({
    name: 'UserProfile',
    setup() { return { store: useAppStore() } },
    props: {
      id: {
        type: String,
      }
    },
    data() {
      const userRoles: DocumentData|undefined = undefined;
      const loading = false;
      const newDisplayName = '';
      return {
        userRoles: userRoles as DocumentData|undefined,
        loading,
        newDisplayName,
        matLogin,
      }
    },
    mounted() {
      this.refresh();
    },
    methods: {
      async refresh():Promise<void> {
        this.loading = true;
        try {
          if (this.uid) {
            this.userRoles = await getUserRole(this.uid);
          } else {
            this.userRoles = undefined;
          }

        }
        catch (e) {
          console.error(e)
        }
        finally {
          this.loading = false;
        }
      },
      async setDisplayName() {
        try {
          this.loading = true;
          const result = await setDisplayName(this.newDisplayName)
          if (result.message) this.$notify.success(result.message);
          this.refresh()
        }
        catch (error) {
          const e:any = error;
          this.$notify.error(e?.message)
        } finally {
          this.loading = false;
        }

      }
    },
    computed: {
      uid(): string|undefined {
        // Prop, else logged in user else nothing
        return this.id ?? this.firebaseUser?.uid;
      },
      firebaseAuthed():boolean {
        return !!this.store.user;
      },
      isAuthenticated():boolean {
        return this.firebaseAuthed;
      },
      firebaseUser(): User|undefined {
        return this.store.user;
      },
      authName():string {
        return this.state.user?.displayName || 'anon'
      }
    },  })
</script>

<style scoped>

</style>
