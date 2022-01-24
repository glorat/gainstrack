<template>
  <section>
    <div v-if="user">
      Hello {{ user.displayName }}
      <q-btn color="primary" @click="logout">Logout</q-btn>
    </div>
    <section v-show="!user" id="firebaseui-auth-container"></section>
  </section>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// For login screen styling
import 'firebaseui/dist/firebaseui.css'

import * as firebaseui from 'firebaseui'
import {MyState} from 'src/store'

export default defineComponent({
  name: 'FirebaseLogin',
  methods: {
    async logout(): Promise<void> {
      const fauth = firebase.auth()
      await fauth.signOut()
      await this.$store.dispatch('logout')
    }
  },
  computed: {
    user(): firebase.User | undefined {
      const state: MyState = this.$store.state
      return state.user
    }
  },
  mounted() {
    let ui = firebaseui.auth.AuthUI.getInstance()
    if (!ui) {
      const fauth = firebase.auth()
      ui = new firebaseui.auth.AuthUI(fauth)
    }
    const uiConfig = {
      signInSuccessUrl: '/', // This redirect can be achieved by route using callback.
      // signInFlow: "popup",

      signInOptions: [
        // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        // firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
      ]
    }
    ui.start('#firebaseui-auth-container', uiConfig)
  }
})
</script>

<style scoped>

</style>
