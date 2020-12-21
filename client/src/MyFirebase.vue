<template>
  <div></div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {myAnalytics, myAuth} from 'src/lib/myfirebase';
  import {Store} from 'vuex';

  async function fbAuthStateChanged (user: firebase.User|null, $store: Store<unknown>) {
    if (user) {
      await $store.dispatch('changeUser', { uid: user.uid, displayName: user.displayName, email: user.email })
    } else {
      await $store.dispatch('changeUser', undefined)
    }
  }

  export default Vue.extend({
    name: 'MyFirebase',

    created(): void {
      this.$router.afterEach((to) => {
        myAnalytics().logEvent('page_view', {page_path: to.path})
      });
      myAuth().onAuthStateChanged(async user => {
        if (user) {
          console.log('firebase auth')
          myAnalytics().setUserId(user.uid)
          console.log(user)
          const summary = await this.$store.dispatch('loginWithToken', () => user.getIdToken(false))
            .then(response => {
              // console.log('firebase auth accepted by backend');
              // this.$analytics.logEvent('login');
            })
            .catch(error => {
              console.error(`Auth token rejected by server: ${error}`);
              this.$store.dispatch('logout');
            })
            .finally(() => {console.log('login flow done')});
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
