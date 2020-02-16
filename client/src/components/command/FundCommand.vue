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
            Fund:
            <account-selector class="c-account-id" v-model="c.accountId" v-on:input="accountIdChanged" :account-list="fundableAccounts"></account-selector>
        </div>
        <div>
            Amount
            <balance-editor class="c-change" v-model="c.change" v-on:input="inputChanged()"></balance-editor>
        </div>
        <div>
            Override funding source (optional)
            <account-selector class="c-other-account" v-model="c.otherAccount" v-on:input="accountIdChanged" :placeholder="defaultFundingAccount"></account-selector>
        </div>

    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector';
    import {DatePicker, Input, Option, Select, Switch} from 'element-ui';

    export default {
        name: 'FundCommand',
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
                const acct = this.findAccount(this.c.accountId);
                if (acct) {
                    this.c.change.ccy = acct.ccy;
                }
            },
            otherAccountChanged() {
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.otherAccount);
                if (acct) {
                    this.c.change.ccy = acct.ccy;
                }
            },
        },
        computed: {
            mainAccount() {
                return this.findAccount(this.c.accountId);
                // const all = this.$store.state.summary.accounts;
                // const acct = all.find(x => x.accountId === this.c.accountId);
                // return acct;
            },
            fundableAccounts() {
                const all = this.$store.state.summary.accounts;
                const acctMatch = /^(Assets|Liabilities)/;
                const scope = all.filter(x => acctMatch.test(x.accountId) && !x.options.generatedAccount);
                return scope.map(x => x.accountId).sort();
            },
            defaultFundingAccount() {
                const acct = this.mainAccount;
                if (acct) {
                    return acct.options.fundingAccount;
                } else {
                    return 'Equity:Opening';
                }
            },
            isValid() {
                const c = this.c;
                return c.date
                    && c.accountId
                    && c.change.number
                    && c.change.ccy
                    && (this.otherAccount || this.defaultFundingAccount);
            },
            toGainstrack() {
                if (this.isValid) {
                    return `${this.c.date} fund ${this.c.accountId} ${this.c.change.number} ${this.c.change.ccy}`;
                }
            }
        }

    }
</script>

<style scoped>

</style>