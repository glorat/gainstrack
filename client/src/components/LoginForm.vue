<template>
    <div>
        <form @submit.prevent="login()" v-if="!authentication.username">
            <input type="text" name="username" placeholder="Username" v-model="username" pattern="\w*" title="Only lowercase"></input>
            <input type="password" name="password" v-model="password"></input>
            <input type="submit" name="login" value="Login" :disabled="loading"></input>
        </form>
        <div v-if="authentication.username">
            Logged in as <em>{{authentication.username}}</em>
            <form @submit.prevent="logout()">
                <input type="submit" name="logout" value="Logout" :disabled="loading">
            </form>
        </div>
    </div>
</template>

<script>
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
            }
        },
        methods: {
            async login() {
                const notify = this.$notify;
                this.loading = true;
                const summary = await this.$store.dispatch('login', {username: this.username, password: this.password})
                    .then(response => response.data)
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
            }
        }
    }
</script>

<style scoped>

</style>