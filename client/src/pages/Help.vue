<template>
    <div v-html="rendered">
        <h2>Welcome to gainstrack</h2>
        <h3>Why gainstrack?</h3>
        <p>
            Do you know your networth? Is your wealth spread across multiple accounts in multiple countries? Struggling to keep track? How close are you to financial independence?
        </p>
        <p>
            Gainstrack is the app to help you get in personal control of your finances with a dashboard to see your wealth in one place
        </p>
    </div>
</template>

<script>
    import axios from 'axios';
    import marked from 'marked';

    export default {
        name: 'Help',
        data() {
            return {
                content: 'Loading...'
            }
        },
        computed: {
            rendered() {
                return marked(this.content)
            }
        },
        mounted() {
            axios.get('/welcome.md')
                .then(response => {
                    this.content = response.data;
                })
                .catch(error => this.content = error.message);
        }
    }
</script>

<style scoped>

</style>
