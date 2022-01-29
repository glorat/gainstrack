<template>
    <div>
        <div>
            <command-date-editor id="trade-date" v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector class="c-account-id" placeholder="Source Account"
                            :modelValue="dc.accountId" :original="c.accountId"
                            @update:modelValue="c.accountId=$event" :account-list="tradeableAccounts"></account-selector>
        </div>
        <div>
            <help-tip tag="tradeChange"></help-tip>
          <balance-editor class="c-change" label="Purchased Amount" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradePrice"></help-tip>
          <balance-editor class="c-price" label="Price" :modelValue="dc.price" :original="c.price" @update:modelValue="c.price=$event"></balance-editor>
        </div>
        <div>
            <help-tip tag="tradeCommission"></help-tip>
          <balance-editor label="Commission" class="c-commission"
                          :modelValue="dc.commission" :original="c.commission" @update:modelValue="c.commission=$event"></balance-editor>
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
