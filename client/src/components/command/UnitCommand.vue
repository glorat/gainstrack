
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
    import { mapGetters } from 'vuex'
    import { LocalDate } from '@js-joda/core'

    export default Vue.extend({
        name: 'UnitCommand',
        mixins: [CommandEditorMixin],
        components: {AccountSelector, BalanceEditor},
      mounted () {
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
              const c = this.c;
              // TODO: Consider finding prev by Tx to cover both trade and unit commands
            const cmds = this.$store.state.allState.commands;
            const prev = cmds.reverse().find(cmd =>  cmd.accountId === this.c.accountId && cmd.commandType === 'unit' && cmd.balance.ccy === this.c.balance.ccy);
            const fxConverter = this.fxConverter;
            if (!fxConverter) debugger;
            if (prev) {
              this.c.balance.number = prev.balance.number;
              // this.c.price.number = prev.price.number;
              this.c.price.ccy = prev.price.ccy;
            }
            if (c.balance.ccy && c.price.ccy && c.date) {
              this.c.price.number = fxConverter.getFX(c.balance.ccy, c.price.ccy, LocalDate.parse(c.date));
            }
          }
        },
        computed: {
          ...mapGetters(['fxConverter']),
            toGainstrack() {
                return `${this.c.date} unit ${this.c.accountId} ${this.c.balance.number} ${this.c.balance.ccy} @${this.c.price.number} ${this.c.price.ccy}`;
            }
        }
    })
</script>

<style scoped>

</style>
