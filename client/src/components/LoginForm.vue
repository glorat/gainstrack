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
<!--        <button class="login" :disabled="auth.loading" @click="auth0validate">Test</button>-->

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
          auth0ready() {
            return !this.auth.loading;
          },
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
        auth0ready (val) {
          console.log(`auth0ready ${val}, authn: ${this.auth.isAuthenticated}`)
          if (val && this.auth.isAuthenticated) {
            this.auth0validate()
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
            async auth0validate() {
              const auth = this.auth;
              this.loading = true;
              const notify = this.$notify;
              const getToken = async () => await auth.getTokenSilently();
              try {
                await this.$store.dispatch('loginWithToken', getToken)
              }
              catch (error) {
                notify.error('Something went wrong logging in');
                console.error(error);
                // FIXME: Clears store token but not the auth0 state
                await this.$store.dispatch('logout');
              }
              finally {
                this.loading = false
              }

            },
        },
    }
</script>

<style scoped>

</style>
