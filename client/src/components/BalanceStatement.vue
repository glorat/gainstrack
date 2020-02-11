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
            <account-selector v-model="c.accountId" v-on:input="accountIdChanged"></account-selector>
        </div>
        <div>
            Balance
            <balance-editor v-model="c.balance"></balance-editor>
        </div>
        <div>
            Adjustment Account:
            <account-selector v-model="c.otherAccount"></account-selector>
        </div>
    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';
    import AccountSelector from './AccountSelector';
    import {DatePicker, Input, Option, Select, Switch} from 'element-ui';

    export default {
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
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
                    this.c.balance.ccy = acct.ccy;
                }
            },
        },
        data() {
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.balance = c.balance || {number: 0, ccy: ''};
            c.price = c.price || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            c.otherAccount = c.otherAccount || '';
            return {c};
        },
        computed: {
            isValid() {
                const c = this.c;
                return c.accountId && c.date && c.balance.ccy && c.otherAccount;
            },
            toGainstrack() {
                if (this.isValid) {
                    const c = this.c;
                    return `${c.date} bal ${c.accountId} ${c.balance.number} ${c.balance.ccy} ${c.otherAccount}`;
                }
            }
        }
    }
</script>

<style scoped>

</style>