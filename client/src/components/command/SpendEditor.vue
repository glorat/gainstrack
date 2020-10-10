<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector
            placeholder="Spending Source"
            class="c-account-id" :value="dc.accountId" :original="c.accountId"
            @input="c.accountId=$event" :account-list="spendableAccounts"
          ></account-selector>

        </div>
        <div>
          <balance-editor label="Spent Amount" class="change" :value="dc.change" :original="c.change" @input="c.change=$event"></balance-editor>
        </div>
    </div>
</template>

<script>
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from './BalanceEditor';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';

    export default {
        name: 'SpendEditor',
        components: {AccountSelector, BalanceEditor},
        mixins: [CommandEditorMixin],
        methods: {
        },
        computed: {
          dc() {
            const dc = {...this.c};
            const acct = this.findAccount(this.c.accountId);
            if (acct && !dc.change.ccy) {
              dc.change = {...dc.change, ccy: acct.ccy};
            }
            // Would need some serious AI to predict the default spent amount!
            return dc;
          },
            spendableAccounts() {
                return this.mainAccounts.filter(x => x.startsWith('Expenses:'));
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
                    return `${c.date} spend ${c.accountId} ${c.change.number} ${c.change.ccy}`;
                } else {
                    return '';
                }
            }
        },
    }
</script>

<style scoped>

</style>
