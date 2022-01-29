<template>
  <div>
    <div>
      <command-date-editor v-model="c.date"></command-date-editor>
    </div>
    <div v-if="!hideAccount">
      <account-selector class="c-account-id" :model-value="dc.accountId" :original="c.accountId"
                        @update:model-value="c.accountId=$event" :account-list="balanceableAccounts"></account-selector>
    </div>
    <div v-if="showBalance">
      <balance-editor label="Balance" class="c-balance" :model-value="dc.balance" :original="c.balance" @update:model-value="c.balance=$event"></balance-editor>
    </div>
    <div v-if="showChange">
      <balance-editor label="Change" class="c-change" :model-value="dc.change" :original="c.change" @update:model-value="c.change=$event"></balance-editor>
    </div>
    <div v-if="canBalanceOrUnit">
      <q-radio :model-value="dc.commandType" @update:model-value="c.commandType=$event" val="bal" label="Simple Balance" />
      <q-radio :model-value="dc.commandType" @update:model-value="c.commandType=$event" val="unit" label="With Cost" />
    </div>

    <div v-if="dc.commandType==='bal'">
      <help-tip tag="balOtherAccount"></help-tip>
      <account-selector class="c-other-account" placeholder="Adjustment Account"
                        :model-value="dc.otherAccount" :original="c.otherAccount"
                        @update:model-value="c.otherAccount=$event" :account-list="mainAccounts"></account-selector>
    </div>
    <div v-if="showPrice">
      <balance-editor label="Price" :model-value="dc.price" :original="c.price" @update:model-value="c.price=$event"></balance-editor>
    </div>
    <div v-if="showCommission">
      <help-tip tag="tradeCommission"></help-tip>
      <balance-editor label="Commission" class="c-commission"
                      :model-="dc.commission" :original="c.commission" @update:model-value="c.commission=$event"></balance-editor>
    </div>
    <div>
      <q-btn color="secondary" v-if="canConvertToTrade" @click="convertToTrade">Convert to Trade</q-btn>
    </div>
  </div>
</template>

<script>
  import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue';
  import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
  import AccountSelector from '../AccountSelector.vue';
  import { defineComponent } from 'vue';
  import {
    canConvertToTrade,
    commandIsValid, convertToTrade,
    defaultedCommand,
    propDefined,
    toGainstrack
  } from 'src/lib/commandDefaulting'

  export default defineComponent({
    name: 'BalanceOrUnit',
    props: {cmd: Object},
    mixins: [CommandEditorMixin],
    components: {
      BalanceEditor,
      AccountSelector,
    },
    methods: {

      convertToTrade() {

        const c = this.c;
        const stateEx = this.allStateEx;
        const fxConverter = this.fxConverter;
        const newc = convertToTrade(c, stateEx, fxConverter)

        this.c = newc;

      }
    },
    computed: {
      dc() {
        // Take care to use copy-on-write pattern in this function
        const c = this.c;
        const stateEx = this.allStateEx;
        const fxConverter = this.fxConverter
        const dc = defaultedCommand(c, stateEx, fxConverter);
        return dc;
      },
      mainAccount() {
        return this.findAccount(this.dc.accountId);
      },
      balanceableAccounts() {
        return this.$store.state.allState.accounts.filter(acct => {
          const id = acct.accountId;
          const t = (/^(Asset|Liabilities|Equity)/.test(id));
          return (acct.options.generatedAccount === false) && t
        }).map( a => a.accountId).sort()
      },
      showBalance() {
        return propDefined(this.dc, 'balance');
      },
      showChange() {
        return propDefined(this.dc, 'change');
      },
      showCommission() {
        return propDefined(this.dc, 'commission');
      },
      showPrice() {
        if (this.dc.commandType==='bal') return false;
        return propDefined(this.dc, 'price')
      },
      canBalanceOrUnit() {
        if (!this.dc.commandType?.match('bal|unit')) return false;
        const acct = this.mainAccount;
        if (!acct) return false;
        return acct.options.multiAsset;
      },
      isValid() /*: boolean*/ {
        const c = this.dc;
        return commandIsValid(c);
        // lint-ignore
      },
      toGainstrack() /*: string*/ {
        return toGainstrack(this.dc)
      },
      canConvertToTrade() {
        const c = this.c;
        const stateEx = this.allStateEx;
        const fxConverter = this.fxConverter;
        return canConvertToTrade(c, stateEx, fxConverter)
      },
    },

  });
</script>

<style scoped>

</style>
