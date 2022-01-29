<template>
    <div>
        <div>
            <command-date-editor id="trade-date" v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector class="c-account-id" placeholder="Source Account"
                            :model-value="dc.accountId" :original="c.accountId"
                            @update:model-value="c.accountId=$event" :account-list="tradeableAccounts"></account-selector>
        </div>
        <div>
            <help-tip tag="tradeChange"></help-tip>
          <balance-editor class="c-change" label="Purchased Amount" :model-value="dc.change" :original="c.change" @update:model-value="c.change=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradePrice"></help-tip>
          <balance-editor class="c-price" label="Price" :model-value="dc.price" :original="c.price" @update:model-value="c.price=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradeCommission"></help-tip>
          <balance-editor label="Commission" class="c-commission"
                          :model-value="dc.commission" :original="c.commission" @update:model-value="c.commission=$event"></balance-editor>
        </div>

    </div>
</template>

<script>
    import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector';
    import CommandDateEditor from '../CommandDateEditor';
    import { commandIsValid, defaultedTradeCommand, toGainstrack } from 'src/lib/commandDefaulting'

    export default {
        name: 'TradeEditor',
        components: {AccountSelector, BalanceEditor, CommandDateEditor},
        mixins: [CommandEditorMixin],
        methods: {
        },
        computed: {
          dc() {
            const c = this.c;
            const stateEx = this.allStateEx;
            const fxConverter = this.fxConverter;
            const dc = defaultedTradeCommand(c, stateEx, fxConverter)
            return dc;

          },
          isValid () {
            const c = this.dc
            return commandIsValid(c)
          },
          toGainstrack () {
            return toGainstrack(this.dc)
          }
        },
    }
</script>

<style scoped>

</style>
