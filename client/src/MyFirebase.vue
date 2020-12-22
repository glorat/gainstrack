<template>
  <div></div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {myAnalytics, myAuth} from 'src/lib/myfirebase';
  import {Store} from 'vuex';
  import axios from 'axios';

  async function fbAuthStateChanged (user: firebase.User|null, $store: Store<unknown>) {
    if (user) {
      await $store.dispatch('changeUser', { uid: user.uid, displayName: user.displayName, email: user.email })
    } else {
      await $store.dispatch('changeUser', undefined)
    }
  }

  export default Vue.extend({
    name: 'MyFirebase',

    computed: {
      auth0token() {
        return this.$store.state.auth0token
      },
    },
    watch: {
      async auth0token(val) {
        if (val) {
          const res = await axios.post('/functions/auth/firebase')
          if (res.data?.firebaseToken) {
            const fbToken = res.data.firebaseToken
            const cred = await myAuth().signInWithCustomToken(fbToken)
            console.log(`Fb tokin login for`);
            console.error(cred);
          }
        }
      }
    },
    created(): void {
      this.$router.afterEach((to) => {
        myAnalytics().logEvent('page_view', {page_path: to.path})
      });
      myAuth().onAuthStateChanged(async user => {
        if (user && !this.auth0token) {
          console.log('firebase auth')
          myAnalytics().setUserId(user.uid)
          console.log(user)
          await this.$store.dispatch('loginWithToken', () => user.getIdToken(false))

          try {
            await this.$store.dispatch('loginWithToken', () => user.getIdToken(false))
          }
          catch (error) {
            // notify.error('Auth token rejected by server');
            console.error(error);
            await this.$store.dispatch('logout');
          }

        } else {
          console.log('firebase not auth')
        }
        // Tell the store user has updated
        const store = this.$store;
        await fbAuthStateChanged(user, store)
      })

    }
  })

</script>

<style scoped>

</style>
