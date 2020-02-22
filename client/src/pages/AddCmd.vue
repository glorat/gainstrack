<template>
    <div>
        <div v-if="!success">
            <command-editor :type="this.$route.query.cmd" v-on:gainstrack-changed="gainstrackChange($event)"></command-editor>
            <div>
                <pre>{{ commandStr }}</pre>
            </div>
            <button class="c-add" :disabled="result.errors.length || !commandStr" type="button" v-on:click="addCommand">Add</button>
        </div>
        <div v-if="result.errors.length>0">
            <source-errors :errs="result.errors"></source-errors>
        </div>
        <hr>
        <div v-if="result.added[0]">
<!--            <router-link v-if="added[0]" :to="{name:'account', params:{accountId:added[0].accountId}}">{{added[0].accountId}}</router-link>-->
            <h4>Balance changes</h4>
            <table class="queryresults sortable">
                <thead>
                    <tr><th>Account</th><th>Position Change</th><th>Value Change</th></tr>
                </thead>

                <tr v-for="change in result.accountChanges" :key="change.accountId">
                    <td><router-link :to="{name: 'account', params: [change.accountId]}">{{ change.accountId }}</router-link></td>
                    <td class="num"><span v-for="amt in change.unitChange" :key="amt.ccy">{{ amt.number }} {{ amt.ccy }} </span></td>
                    <td class="num">{{ change.valueChange }} {{ baseCcy }}</td>
                </tr>
                <tr>
                    <td class="subtotal">Networth Change</td>
                    <td class="subtotal"></td>
                    <td class="subtotal num">{{ result.networthChange }}</td>
                </tr>
            </table>

            <h4>Journal additions</h4>
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
    import EventBus from '@/event-bus';

    export default {
        name: 'AddCmd',
        components: {CommandTable, CommandEditor, SourceErrors},
        data() {
            return {
                commandStr: '',
                result: {
                  added: [],
                  accountChanges: [],
                  errors: [],
                  networthChange: 0.0,
                },
                added: [],
                accountChanges: [],
                errors: [],
                testing: false,
                success: false,
            }
        },
      computed: {
          baseCcy() {
            return this.$store.state.summary.baseCcy;
          },
        networthChange() {
            return this.result.networthChange
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
                            this.accountChanges = response.data.accountChanges;
                            this.errors = response.data.errors;
                            this.result = response.data;

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
                            EventBus.$emit('command-added', str);
                        }

                    })
                    .catch(error => this.$notify.error(error.stack || error))
            },
        },
    }
</script>

<style scoped>
    .subtotal {
        border-top-color: black;
        border-top-width: 2px;
        border-top-style: solid;
    }
</style>
