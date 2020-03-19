<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div>
            Transfer From:
            <account-selector class="c-account-id" v-model="c.accountId" v-on:input="accountIdChanged"
                              :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
            amount
            <balance-editor class="c-change" v-model="c.change" v-on:input="changeChanged()"></balance-editor>
        </div>
        <div>
            To
            <account-selector class="c-other-account" v-model="c.otherAccount" v-on:input="otherAccountIdChanged"
                              :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
            value
            <balance-editor class="c-options-target-change" v-model="c.options.targetChange" v-on:input="inputChanged()"></balance-editor>
        </div>


    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import {DatePicker, Input, Option, Select, Switch} from 'element-ui';
    import AccountSelector from '../AccountSelector';

    export default {
        name: 'Transfer',
        props: {cmd: Object},
        components: {
            BalanceEditor,
            AccountSelector,
            'el-date-picker': DatePicker,
            'el-select': Select,
            'el-option': Option,
            'el-switch': Switch,
            'el-input': Input,
        },
        mixins: [CommandEditorMixin],
        data() {
            const c = {};
            c.options = {targetChange: {number: 0, ccy: ''}};

            return {c};
        },
        methods: {
            accountIdChanged() {
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
                    this.c.change.ccy = acct.ccy;
                }
            },
            otherAccountIdChanged() {
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.otherAccount);
                if (acct) {
                    this.c.options.targetChange.ccy = acct.ccy;
                }
            },
            changeChanged() {
                if (!this.c.options.targetChange.ccy) {
                    this.c.options.targetChange.ccy = this.c.change.ccy;
                }
                if (this.c.options.targetChange.ccy === this.c.change.ccy) {
                    this.c.options.targetChange.number = this.c.change.number;
                }
            },
        },
        computed: {
            transferableAccounts() {
                return this.mainAccounts;
            },
            isValid() {
                const c = this.c;
                return c.accountId
                    && c.otherAccount
                    && c.change.number
                    && c.options.targetChange.number
                    && c.change.ccy
                    && c.options.targetChange.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                    const c = this.c;
                    let baseStr = `${c.date} tfr ${c.accountId} ${c.otherAccount} ${c.change.number} ${c.change.ccy}`;
                    if (c.change.number !== c.options.targetChange.number
                        || c.change.ccy !== c.options.targetChange.ccy) {
                        baseStr += ` ${c.options.targetChange.number} ${c.options.targetChange.ccy}`;
                    }
                    return baseStr;
                } else {
                    return '';
                }
            }
        }
    }
</script>

<style scoped>

</style>
