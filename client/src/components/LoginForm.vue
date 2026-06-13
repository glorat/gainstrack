<template>
    <div>
        <div v-if="isAuthenticated">
            Logged in as <em>{{ authName }}</em>
            <form @submit.prevent="logout()">
              <input type="submit" name="logout" value="Logout">
            </form>
        </div>
        <div v-else>
          <button class="login" @click="login">Sign Up/Log in</button>
        </div>
    </div>
</template>

<script>
import { signOut } from 'firebase/auth';
import { myAuth } from 'src/lib/assetdb/myfirebase';
import {useAppStore} from 'src/stores';

export default {
    name: 'LoginForm',
    setup() { return { store: useAppStore() } },
    computed: {
      isAuthenticated() {
        return !!this.store.user;
      },
      authName() {
        return this.store.user?.displayName ?? 'User';
      }
    },
    methods: {
        login() {
          this.$router.push('/login');
        },
        async logout() {
          await signOut(myAuth());
          await this.store.logout();
        },
    },
}
</script>

<style scoped>

</style>
