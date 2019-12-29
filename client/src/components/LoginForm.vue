<template>
    <div>
        <form @submit.prevent="login()" v-if="!authentication.username">
            <input type="text" name="username" placeholder="Username" v-model="username" pattern="\w*" title="Only lowercase"></input>
            <input type="password" name="password" v-model="password"></input>
            <input type="submit" name="submit" value="Login"></input>
        </form>
        <div v-if="authentication.username">
            Logged in as <em>{{authentication.username}}</em>
        </div>
    </div>
</template>

<script>
    import axios from 'axios';

    export default {
        name: 'LoginForm',
        data() {
            return {
                username: '',
                password: '',
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
                const summary = await this.$store.dispatch('login', {username: this.username, password: this.password})
                    .then(response => response.data)
                    .catch(error => notify.error(error.response.data));
                if (summary.authentication.error) {
                    notify.warning(summary.authentication.error);
                }
            }
        }
    }
</script>

<style scoped>

</style>