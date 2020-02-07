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
            <account-selector v-model="c.accountId" v-on:input="accountIdChanged"></account-selector>
        </div>
        <div>
            Amount
            <balance-editor v-model="c.change" v-on:input="inputChanged()"></balance-editor>
        </div>
        <div>
            Funding source
            <account-selector v-model="c.otherAccount" v-on:input="accountIdChanged" :placeholder="defaultFundingAccount"></account-selector>
        </div>

    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';
    import AccountSelector from './AccountSelector';
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
        data() {
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.change = c.change || {number: 0, ccy: ''};
            c.price = c.price || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            c.otherAccount = c.otherAccount || '';
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
        },
        computed: {
            mainAccount() {
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                return acct;
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