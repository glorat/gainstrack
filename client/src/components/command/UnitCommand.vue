
<template>
    <div>
        <div>
          <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
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
    import { defineComponent } from 'vue';
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from '../../lib/assetdb/components/BalanceEditor';
    import { mapGetters } from 'vuex'
    import { LocalDate } from '@js-joda/core'

    export default defineComponent({
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
            const underCcy = this.allStateEx.underlyingCcy(this.c.balance.ccy, this.c.accountId);
            if (underCcy) {
              const fxConverter = this.fxConverter

              // this.c.balance.number = prev.balance.number // FIXME: get current balance
              this.c.price.ccy = underCcy;

              if (c.balance.ccy && c.price.ccy && c.date) {
                const dt = LocalDate.parse(c.date);
                this.c.price.number = fxConverter.getFXTrimmed(c.balance.ccy, c.price.ccy, dt);
              }
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
