<template>
    <div>
        <div>
          <command-date-editor v-model="c.date"></command-date-editor>
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
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import Vue from 'vue';
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from './BalanceEditor';

    export default Vue.extend({
        name: 'UnitCommand',
        mixins: [CommandEditorMixin],
        components: {AccountSelector, BalanceEditor},
        methods: {
            accountIdChanged() {
                const all /*: AccountDTO[]*/ = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
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
