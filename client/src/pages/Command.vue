<template>
<div>
    <command-table :cmds="info.commands"></command-table>
</div>
</template>

<script>
    import axios from 'axios';
    import CommandEditor from '../components/CommandEditor';
    import CommandTable from '@/components/CommandTable.vue';
    import {cloneDeep} from 'lodash';

    export default {
        name: 'Command',
        components: {CommandEditor, CommandTable},
        props: ['accountId'],
        data() {
            return {
                info: {accountId: 'Loading...', rows: []},
                commandStr: '',
                selectedCommand: undefined,
            };
        },
        mounted() {
            axios.get('/api/command/' + this.accountId)
                .then(response => this.info = response.data)
                .catch(error => this.$notify.error(error))
        },
        methods: {
            gainstrackChange(ev) {
                this.commandStr = ev;
            },
            selectCommand(cmd) {
                this.selectedCommand = cloneDeep(cmd);
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
                    .then(response => this.$notify.success(response.data))
                    .catch(error => this.$notify.error(error.response.data))
            },
        },
        filters: {
            amount(value) {
                if (!value) {
                    return ''
                } else {
                    return `${value.number} ${value.ccy}`
                }

            }
        }
    }
</script>

<style scoped>

</style>
