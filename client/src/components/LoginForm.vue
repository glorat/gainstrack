<template>
    <div>
        <div v-if="!$auth.loading">
            <button class="login" v-if="!$auth.isAuthenticated" @click="auth0login">Sign Up/Log in</button>
            <button v-if="false" @click="auth0validate">Test</button>
        </div>
        <hr>
<!--        <form @submit.prevent="login()" v-if="!authentication.username">-->
<!--            <input type="text" name="username" placeholder="Username" v-model="username" pattern="\w*" title="Only lowercase">-->
<!--            <input type="password" name="password" v-model="password">-->
<!--            <input type="submit" name="login" value="Admin Login" :disabled="loading">-->
<!--        </form>-->
        <div v-if="authentication.username">
            Logged in as <em>{{$auth.isAuthenticated ? $auth.user.name : authentication.username}}</em>
            <form @submit.prevent="logout()">
                <input type="submit" name="logout" value="Logout" :disabled="loading || $auth.loading" >
            </form>
        </div>
    </div>
</template>

<script>
    import Vue from 'vue';

    // Import the plugin here
    import {Auth0Plugin} from '../auth';

    Vue.use(Auth0Plugin, {
        domain: process.env.VUE_APP_AUTH0_ID + '.auth0.com',
        clientId: process.env.VUE_APP_AUTH0_CLIENT,
        audience: process.env.VUE_APP_AUTH0_AUDIENCE,
        // @ts-ignore
        // onRedirectCallback: appState => {
        //   router.push(
        //       appState && appState.targetUrl
        //           ? appState.targetUrl
        //           : window.location.pathname
        //   );
        // }
    });

    export default {
        name: 'LoginForm',
        data() {
            return {
                username: '',
                password: '',
                loading: false,
            }
        },
        computed: {
            authentication() {
                return this.$store.state.summary.authentication;
            },
            auth0authned() {
                return this.$auth.isAuthenticated
            },
        },
        watch: {
            auth0authned(val) {
                if (val) {
                    this.auth0validate();
                }
            }
        },
        methods: {
            async login() {
                const notify = this.$notify;
                this.loading = true;
                const summary = await this.$store.dispatch('login', {username: this.username, password: this.password})
                    .then(response => {
                        this.$analytics.logEvent('login');
                        return response.data;
                    })
                    .catch(error => notify.error(error.response.data))
                    .finally(() => this.loading = false);
                if (summary.authentication.error) {
                    notify.warning(summary.authentication.error);
                }
            },
            async logout() {
                const notify = this.$notify;
                this.loading = true;
                const summary = await this.$store.dispatch('logout')
                    .then(response => response.data)
                    .catch(error => notify.error(error.response.data))
                    .finally(() => this.loading = false);
                if (this.$auth.isAuthenticated) {
                    this.$auth.logout({
                        returnTo: window.location.origin
                    });
                }
            },
            // Log the user in
            auth0login() {
                this.$auth.loginWithRedirect();
            },
            async auth0validate() {
                const notify = this.$notify;
                try {
                    const token = await this.$auth.getTokenSilently();
                    this.loading = true;
                    const summary = await this.$store.dispatch('loginWithToken', token)
                        .then(response => {
                            this.$analytics.logEvent('login');
                            return response.data;
                        })
                        .catch(error => {
                            notify.error(`Auth token rejected by server: ${error.response.data}`);
                            this.$store.dispatch('logout');
                        })
                        .finally(() => this.loading = false);
                    if (summary.authentication.error) {
                        notify.warning(summary.authentication.error);
                    }
                } catch (e) {
                    notify.warning(`Not authenticated: ${e.error_description}`)
                }

            }
        }
    }
</script>

<style scoped>

</style>
