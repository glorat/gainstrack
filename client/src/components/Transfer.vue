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
            Transfer:
            <account-selector v-model="c.accountId" v-on:input="accountIdChanged" :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
            amount
            <balance-editor v-model="c.change" v-on:input="inputChanged()"></balance-editor>
        </div>
        <div>
            To
            <account-selector v-model="c.otherAccount" v-on:input="otherAccountIdChanged" :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
            value
            <balance-editor v-model="targetChange" v-on:input="inputChanged()"></balance-editor>
        </div>


    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';
    import {DatePicker, Input, Option, Select, Switch} from 'element-ui';
    import AccountSelector from './AccountSelector';

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
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.change = c.change || {number: 0, ccy: ''};
            c.price = c.price || {number: 0, ccy: ''};
            c.otherAccount = c.otherAccount || '';
            c.commission = c.commission || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            return {c, targetChange: {number: 0, ccy: ''}};
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
                    this.targetChange.ccy = acct.ccy;
                }
            }
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
                    && this.targetChange.number
                    && c.change.ccy
                    && this.targetChange.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                    const c = this.c;
                    let baseStr = `${c.date} tfr ${c.source} ${c.otherAccount} ${c.change.number} ${c.change.ccy}`;
                    if (c.change.number !== this.targetChange.number
                        || c.change.ccy !== this.targetChange.ccy) {
                        baseStr += ` ${this.targetChange.number} ${this.targetChange.ccy}`;
                    }
                    return baseStr;
                }
            }
        }
    }
</script>

<style scoped>

</style>
