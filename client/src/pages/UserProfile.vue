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
  import {MyState} from 'src/store';
  import firebase from 'firebase/compat/app';
  import {getUserRole, setDisplayName} from 'src/lib/assetdb/assetDb';
  import {DocumentData} from  'firebase/firestore';
  import {matLogin} from '@quasar/extras/material-icons';
  import {useAuth} from 'src/auth';

  export default defineComponent({
    name: 'UserProfile',
    props: {
      id: {
        type: String,
      }
    },
    data() {
      const userRoles: DocumentData|undefined = undefined;
      const loading = false;
      const newDisplayName = '';
      const auth = useAuth();
      return {
        auth,
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
      state(): MyState {
        return this.$store.state;
      },
      auth0authned():boolean {
        return this.auth.isAuthenticated
      },
      firebaseAuthed():boolean {
        return !!this.state.user;
      },
      isAuthenticated():boolean {
        return this.auth0authned;
      },
      firebaseUser(): firebase.User|undefined {
        return this.state.user;
      },
      authName():string {
        if (this.auth0authned) {
          return this.auth.user?.name ?? 'anon'
        } else if (this.firebaseAuthed) {
          return this.$store.state.user?.displayName || 'anon'
        } else {
          return 'Unknown'
        }
      }
    },  })
</script>

<style scoped>

</style>
