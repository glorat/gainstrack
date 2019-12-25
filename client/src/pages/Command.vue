<template>
<div>
    <form>
        <command-editor ref="newCmd" v-if="selectedCommand" :cmd="selectedCommand.data" :type="selectedCommand.type" v-on:gainstrack-changed="gainstrackChange($event)"></command-editor>
        <button type="button" v-on:click="testCommand">Test</button>
        <button type="button" v-on:click="addCommand">Add</button>
        <div>Command:<pre>{{ this.commandStr }}</pre></div>
    </form>
    <table class="queryresults sortable">
        <thead>
        <tr>
            <th data-sort="string">account</th>
            <th data-sort="string">date</th>
            <th data-sort="string">type</th>
            <th data-sort="string">description</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="cmd in info.commands" v-on:click="selectCommand(cmd)">
<!--            <td colspan="4"><command-editor :cmd="cmd.data" :type="cmd.type"></command-editor></td>-->
            <td>{{ info.account.key.name }}</td>
            <td>{{ cmd.data.date }}</td>
            <td>{{ cmd.type }}</td>
            <td>{{cmd.description}}</td>
        </tr>
        </tbody>
    </table>
</div>
</template>

<script>
    import axios from 'axios';
    import CommandEditor from '../components/CommandEditor';
    import {cloneDeep} from 'lodash';

    export default {
        name: 'Command',
        components: {CommandEditor},
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
        }
    }
</script>

<style scoped>

</style>
