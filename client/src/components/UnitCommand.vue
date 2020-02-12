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
            <account-selector v-model="c.accountId" :account-list="tradeableAccounts" @input="accountIdChanged"></account-selector>
        </div>
        <div>
            Balance
            <balance-editor v-model="c.balance"></balance-editor>
        </div>
        <div>
            Price
            <balance-editor v-model="c.price"></balance-editor>
        </div>

    </div>
</template>

<script>
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';
    import Vue from 'vue';
    import AccountSelector from './AccountSelector';
    import BalanceEditor from './BalanceEditor';
    import {DatePicker} from 'element-ui';
    import { mapGetters } from 'vuex';

    export default Vue.extend({
        name: 'UnitCommand',
        mixins: [CommandEditorMixin],
        components: {AccountSelector, BalanceEditor, 'el-date-picker': DatePicker},
        data() {
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.balance = c.balance || {number: 0, ccy: ''};
            c.price = c.price || {number: 0, ccy: ''};
            c.commission = c.commission || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            return {c};
        },
        methods: {
            accountIdChanged() {
                const all /*: AccountDTO[]*/ = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
                    // @ts-ignore
                    this.c.price.ccy = acct.ccy;
                    this.c.commission.ccy = acct.ccy;
                }
            },
        },
        computed: {
            toGainstrack() {
                return `${this.c.date} unit ${this.c.accountId} ${this.c.balance.number} ${this.c.balance.ccy} @${this.c.price.number} ${this.c.price.ccy}`;
            }
        }
    })
</script>

<style scoped>

</style>
