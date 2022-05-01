<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector
            placeholder="Earning Source"
            class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
            @update:modelValue="c.accountId=$event" :account-list="earnableAccounts"
          ></account-selector>
        </div>
        <div>
          <balance-editor label="Earned Amount" class="c-change" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
        </div>
    </div>
</template>

<script>
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from '../../lib/assetdb/components/BalanceEditor';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';

    function defaultedEarnCommand(c, stateEx) {
      const dc = {...c};
      const acct = stateEx.findAccount(dc.accountId);
      if (acct && !dc.change.ccy) {
        dc.change = {...dc.change, ccy: acct.ccy};
      }
      // Would need some serious AI to predict the default earned amount!
      return dc;
    }

    export default {
        name: 'EarnEditor',
        components: {AccountSelector, BalanceEditor},
        mixins: [CommandEditorMixin],
        methods: {
        },
        computed: {
          dc() {
            const c = this.c;
            const stateEx = this.allStateEx;
            return defaultedEarnCommand(c, stateEx);
          },
            earnableAccounts() {
                return this.mainAccounts.filter(x => x.startsWith('Income:'));
            },
            isValid() {
              const c /*: AccountCommandDTO*/ = this.dc;
                return !!c.accountId
                    && c.change.number
                    && c.change.ccy;
            },
            toGainstrack() {
              const c /*: AccountCommandDTO*/ = this.dc;
                if (this.isValid) {
                    const tag = c.accountId.substring(7);
                    return `${c.date} earn ${tag} ${c.change.number} ${c.change.ccy}`;
                } else {
                    return '';
                }
            }
        },
    }
</script>

<style scoped>

</style>
