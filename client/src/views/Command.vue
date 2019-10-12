<template>
<div>
    <form>
        <command-editor ref="newCmd" v-if="selectedCommand" :cmd="selectedCommand.data" :type="selectedCommand.type" v-on:gainstrack-changed="gainstrackChange($event)"></command-editor>
        <button type="button" v-on:click="testCommand">Test</button>
        <button type="button" v-on:click="addCommand">Add</button>
        <p>Command:<pre>{{ this.commandStr }}</pre></p>
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
    import CommandEditor from "../components/CommandEditor";
    const _ = require('lodash');


    export default {
        name: "Command",
        components: {CommandEditor: CommandEditor},
        props: ['accountId'],
        data() {
            return {
                info : {accountId:'Loading...', rows:[]},
                commandStr: '',
                selectedCommand: undefined,
            };
        },
        mounted () {
            axios.get('/api/command/' + this.accountId)
                .then(response => this.info = response.data)
                .catch(error => console.log(error))
        },
        methods: {
            gainstrackChange(ev) {
              this.commandStr = ev;
              console.log(ev);
            },
            selectCommand(cmd) {
                this.selectedCommand = _.cloneDeep(cmd);
            },
            testCommand() {
                const str = this.commandStr;
                console.log(str);
                axios.post('/api/post/test', {str:str})
                    .then(response => console.log(response.data))
                    .catch(error => console.log(error))
            },
            addCommand() {
                const str = this.commandStr;
                console.log(str);
                axios.post('/api/post/add', {str:str})
                    .then(response => console.log(response.data))
                    .catch(error => console.log(error))
            },
        }
    }
</script>

<style scoped>

</style>
