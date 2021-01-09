<template>
  <div></div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {myAnalytics, myAuth} from 'src/lib/myfirebase';
  import {Store} from 'vuex';
  import axios from 'axios';
  import firebase from 'firebase/app';

  async function fbAuthStateChanged(user: firebase.User | null, $store: Store<unknown>) {
    if (user) {
      await $store.dispatch('changeUser', {uid: user.uid, displayName: user.displayName, email: user.email})
    } else {
      await $store.dispatch('changeUser', undefined)
    }
  }

  export default Vue.extend({
    name: 'MyFirebase',
    methods: {
      async refreshFirebaseToken() {
        try {
          const res = await axios.post('/functions/auth/firebase');
          if (res.data?.firebaseToken) {
            const fbToken = res.data.firebaseToken;
            await myAuth().signInWithCustomToken(fbToken);
            console.log('Fb tokin login from auth0');
          }
        } catch (e) {
          console.error('Unable to convert auth0 token to firebase');
          console.error(e)
        }
      }
    },
    computed: {
      auth0token() {
        return this.$store.state.auth0token
      },
    },
    watch: {
      async auth0token(val) {
        if (val) {
          await this.refreshFirebaseToken()
        }
      }

    },
    created(): void {
      if (this.auth0token) {
        console.log('auth0ed on startup so getting firebase now')
        this.refreshFirebaseToken() // async
      }
      this.$router.afterEach((to) => {
        myAnalytics().logEvent('page_view', {page_path: to.path})
      });
      myAuth().onAuthStateChanged(async user => {
        if (user && !this.auth0token) {
          console.log('firebase auth')
          // Disabled because
          // 1) Firebase auth is not in effect since we use auth0
          // 2) This goes bad if the auth0 token expires but the firebase custom minted token is still in effect
          // The latter could be fixed by checking the properites of the IdToken

          // myAnalytics().setUserId(user.uid)
          // console.log(user)
          // await this.$store.dispatch('loginWithToken', () => user.getIdToken(false))
          //
          // try {
          //   await this.$store.dispatch('loginWithToken', () => user.getIdToken(false))
          // } catch (error) {
          //   // notify.error('Auth token rejected by server');
          //   console.error(error);
          //   await this.$store.dispatch('logout');
          // }

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
