<template>
    <div>
        <div v-if="!success">
            <command-editor :type="this.$route.query.cmd" v-on:gainstrack-changed="gainstrackChange($event)"></command-editor>
            <div>
                <pre>{{ commandStr }}</pre>
            </div>
            <button :disabled="errors.length || !commandStr" type="button" v-on:click="addCommand">Add</button>
        </div>
        <div v-if="errors.length>0">
            <source-errors :errs="errors"></source-errors>
        </div>
        <hr>
        <div v-if="added[0]">
            <router-link v-if="added[0]" :to="{name:'account', params:{accountId:added[0].accountId}}">{{added[0].accountId}}</router-link>
            <command-table :cmds="added"></command-table>
        </div>
    </div>
</template>

<script>
    import CommandEditor from '../components/CommandEditor';
    import axios from 'axios';
    import CommandTable from '../components/CommandTable';
    import SourceErrors from '../components/SourceErrors';
    import {debounce} from 'lodash';

    export default {
        name: 'AddCmd',
        components: {CommandTable, CommandEditor, SourceErrors},
        data() {
            return {
                commandStr: '',
                added: [],
                errors: [],
                testing: false,
                success: false,
            }
        },
        methods: {
            gainstrackChange(ev) {
                this.commandStr = ev;
                this.testCommand();
            },
            testCommand: debounce(function() {
                const str = this.commandStr;
                const notify = this.$notify;
                if (str) {
                    this.testing = true;
                    axios.post('/api/post/test', {str})
                        .then(response => {
                            this.added = response.data.added;
                            this.errors = response.data.errors;

                        })
                        .catch(error => this.$notify.error(error))
                        .finally(this.testing = false)
                }
            }, 1000),
            addCommand() {
                const str = this.commandStr;
                const notify = this.$notify;
                axios.post('/api/post/add', {str})
                    .then(response => {
                        if (response.data.errors.length > 0) {
                            notify.warning('Errors...' + response.data.errors[0].message)
                        } else {
                            this.added = response.data.added;
                            this.success = true;
                            this.$notify.success(`${this.added.length} entries added`);
                            this.$store.dispatch('reload');
                        }

                    })
                    .catch(error => this.$notify.error(error))
            },
        },
    }
</script>

<style scoped>

</style>