<template>
    <div>
        <div>
            <command-date-editor id="trade-date" v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector class="c-account-id" placeholder="Source Account"
                            :value="dc.accountId" :original="c.accountId"
                            @input="c.accountId=$event" :account-list="tradeableAccounts"></account-selector>
        </div>
        <div>
            <help-tip tag="tradeChange"></help-tip>
          <balance-editor class="c-change" label="Purchased Amount" :value="dc.change" :original="c.change" @input="c.change=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradePrice"></help-tip>
          <balance-editor class="c-price" label="Price" :value="dc.price" :original="c.price" @input="c.price=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradeCommission"></help-tip>
          <balance-editor label="Commission" class="c-commission"
                          :value="dc.commission" :original="c.commission" @input="c.commission=$event"></balance-editor>
        </div>

    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector';
    import CommandDateEditor from '../CommandDateEditor';
    import { LocalDate } from '@js-joda/core'

    export default {
        name: 'TradeEditor',
        components: {AccountSelector, BalanceEditor, CommandDateEditor},
        mixins: [CommandEditorMixin],
        methods: {
        },
        computed: {
          dc() {
            const dc = {...this.c};
            const acct = this.findAccount(this.c.accountId);
            if (!dc.price.ccy) {
              const underCcy = this.allStateEx.underlyingCcy(this.c.change.ccy, this.c.accountId);
              if (underCcy) {
                dc.price = {...dc.price, ccy: underCcy}
                if (!dc.commission.ccy) dc.commission = {...dc.price, ccy: underCcy}
              }
            }

            if (acct) {
              if (!dc.price.ccy) dc.price = {...dc.price, ccy: acct.ccy}
              if (!dc.commission.ccy) dc.commission = {...dc.price, ccy: acct.ccy}
            }

            if (!dc.price.number && dc.price.ccy) {
              const date = LocalDate.parse(this.c.date);
              const number = this.fxConverter.getFXTrimmed(this.c.change.ccy, dc.price.ccy, date);
              if (number) {
                dc.price = {...dc.price, number}
              }
            }

            return dc;

          },
            isValid() {
            const c = this.dc;
                return !!c.accountId
                    && c.change.number
                    && c.change.ccy
                    && c.price.number
                    && c.price.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                  const c = this.dc;
                    let baseStr = `${c.date} trade ${c.accountId} ${c.change.number} ${c.change.ccy} @${c.price.number} ${c.price.ccy}`;
                    if (c.commission.number && c.commission.ccy) {
                        baseStr += ` C${c.commission.number} ${c.commission.ccy}`
                    }
                    return baseStr
                } else {
                    return undefined;
                }

            }
        },
    }
</script>

<style scoped>

</style>
