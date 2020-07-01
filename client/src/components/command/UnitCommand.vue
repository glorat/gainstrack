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
      created () {
          if (!this.c.balance.number) {
            this.defaultStuff();
          }
      },
      methods: {
            accountIdChanged() {
              const acct = this.findAccount(this.c.accountId);
                if (acct) {
                    this.c.price.ccy = acct.ccy;
                    this.c.commission.ccy = acct.ccy;
                    this.defaultStuff();
                }
            },
          defaultStuff() {
            const cmds = this.$store.state.allState.commands;
            const prev = cmds.reverse().find(cmd =>  cmd.accountId === this.c.accountId && cmd.commandType === 'unit' && cmd.balance.ccy === this.c.balance.ccy);
            if (prev) {
              this.c.balance.number = prev.balance.number;
              this.c.price.number = prev.price.number;
              this.c.price.ccy = prev.price.ccy;
            }
          }
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
