<template>
    <div>

        <div v-if="isAuthenticated">
            Logged in as <em>{{  authName }}</em>
            <form @submit.prevent="logout()" v-if="auth0authned">
              <input type="submit" name="logout" value="Logout" :disabled="loading || auth.loading" >
            </form>
        </div>
      <div v-else>
        <button class="login" :disabled="auth.loading" @click="auth0login">Sign Up/Log in</button>
      </div>
    </div>
</template>

<script>

    import { useAuth } from 'src/auth'

    export default {
        name: 'LoginForm',
        data() {
          const auth = useAuth();
            return {
              auth,
              loading: false,
            }
        },
        computed: {
          auth0authned() {
            return this.auth.isAuthenticated
          },
          firebaseAuthed() {
            return !!this.$store.state.user;
          },
          isAuthenticated() {
            return this.auth0authned;
          },
          authName() {
            if (this.auth0authned) {
              return this.auth.user?.name ?? 'anon'
            } else if (this.firebaseAuthed) {
              return this.$store.state.user.displayName
            } else {
              return 'Unknown'
            }
          }
        },
        watch: {
          // FIXME: Is this relying on a race condition to be invoked on startup??
            auth0authned(val) {
                if (val) {
                    this.auth0validate();
                }
            }
        },
        methods: {
            async logout() {
                if (this.auth.isAuthenticated) {
                    this.auth.logout({
                        returnTo: window.location.origin
                    });
                }
            },
            // Log the user in
            auth0login() {
                this.auth.loginWithRedirect();
            },
            async loginWithToken(auth) {
              this.loading = true;
                const notify = this.$notify;
                const getToken = async () => await auth.getTokenSilently();
                try {
                  await this.$store.dispatch('loginWithToken', getToken)
                }
                catch (error) {
                  notify.error('Something went wrong logging in');
                  console.error(error);
                  this.$store.dispatch('logout');
                }
                finally {
                  this.loading = false
                }

            },
            async auth0validate() {
                await this.loginWithToken(this.auth)

            },
        },
    }
</script>

<style scoped>

</style>
