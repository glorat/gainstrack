<template>
    <div>
        <div v-if="!resultStr">
            <command-editor :type="this.$route.query.cmd" v-on:gainstrack-changed="gainstrackChange($event)"></command-editor>
            <div>
                <pre>{{ commandStr }}</pre>
            </div>
            <button :disabled="!commandStr" type="button" v-on:click="addCommand">Add</button>
        </div>
        <div v-if="resultStr">
            <router-link :to="{path:'/journal'}">See Journal</router-link>
        </div>
    </div>
</template>

<script>
    import CommandEditor from '../components/CommandEditor';
    import axios from 'axios';

    export default {
        name: 'AddCmd',
        components: {CommandEditor},
        data() {
            return {
                commandStr: '',
                resultStr: '',
            }
        },
        methods: {
            gainstrackChange(ev) {
                this.commandStr = ev;
            },
            testCommand() {
                const str = this.commandStr;
                axios.post('/api/post/test', {str})
                    .then(response => this.$notify.success(response.data.success))
                    .catch(error => this.$notify.error(error.response.data))
            },
            addCommand() {
                const str = this.commandStr;
                axios.post('/api/post/add', {str})
                    .then(response => {
                        this.$notify.success(response.data);
                        this.resultStr = response.data;
                    })
                    .catch(error => this.$notify.error(error.response.data))
            },
        },
    }
</script>

<style scoped>

</style>