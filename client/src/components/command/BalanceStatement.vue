<template>
    <div>
        <div>
            <el-date-picker
                    v-model="c.date"
                    type="date"
                    value-format="yyyy-MM-dd"
                    size="mini"
                    :clearable="false"
            >
            </el-date-picker>
        </div>
        <div>
            Account:
            <account-selector v-model="c.accountId" v-on:input="accountIdChanged" :account-list="balanceableAccounts"></account-selector>
        </div>
        <div>
            Balance
            <balance-editor v-model="c.balance"></balance-editor>
        </div>
        <div>
            Adjustment Account:
            <account-selector v-model="c.otherAccount" :account-list="mainAccounts"></account-selector>
        </div>
    </div>
</template>

<script>
    // import {AccountCommandDTO, AccountDTO} from '@/models';
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector.vue';
    import {DatePicker, Input, Option, Select, Switch} from 'element-ui';
    import Vue from 'vue';


    // interface MyData {
    //     c: AccountCommandDTO
    // }

    export default Vue.extend({
        name: 'BalanceStatement',
        props: {cmd: Object},
        mixins: [CommandEditorMixin],
        components: {
            BalanceEditor,
            AccountSelector,
            'el-date-picker': DatePicker,
            'el-select': Select,
            'el-option': Option,
            'el-switch': Switch,
            'el-input': Input,
        },
        methods: {
            accountIdChanged() {
                const all /*: AccountDTO[]*/ = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
                    // @ts-ignore
                    this.c.balance.ccy = acct.ccy;
                }
                const allCmds /*: AccountCommandDTO[]*/ = this.$store.state.summary.commands;
                const prev = allCmds.find(
                    x => x.accountId === this.c.accountId && x.commandType === 'bal');
                if (prev) {
                    this.c.otherAccount = prev.otherAccount;
                } else {
                    this.c.otherAccount = 'Equity:Opening'
                }
            },
        },
        data() /*: MyData*/ {
            let c /*: AccountCommandDTO*/ = {accountId: '', date: ''};
            if (this.cmd) {
                c = {...this.cmd};
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.balance = c.balance || {number: 0, ccy: ''};
            c.price = c.price || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            c.otherAccount = c.otherAccount || '';
            return {c};
        },
        computed: {
            balanceableAccounts() {
                return this.$store.state.summary.accounts.filter(acct => {
                    const id = acct.accountId;
                    const t = (/^(Asset|Liabilities|Equity)/.test(id));
                    return (acct.options.generatedAccount === false) && t
                }).map( a => a.accountId).sort()
            },
            isValid() /*: boolean*/ {
                const c = this.c;
                // @ts-ignore
                return c.accountId && c.date && c.balance && c.balance.ccy && c.otherAccount;
            },
            toGainstrack() /*: string*/ {
                if (this.isValid) {
                    const c /*: AccountCommandDTO*/ = this.c;
                    // @ts-ignore
                    return `${c.date} bal ${c.accountId} ${c.balance.number} ${c.balance.ccy} ${c.otherAccount}`;
                } else {
                    return '';
                }
            }
        }
    });
</script>

<style scoped>

</style>