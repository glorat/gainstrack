<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
      <div v-if="!hideAccount">
        <account-selector class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
                          @update:modelValue="c.accountId=$event" :account-list="fundableAccounts"
                          placeholder="Account to fund"
        ></account-selector>
      </div>
      <div>
        <balance-editor class="c-change" label="Funding Amount" :modelValue="dc.change" :original="c.change" @update:modelValue="c.change=$event"></balance-editor>
      </div>
        <div>
            Override funding source (optional) <help-tip tag="fundOtherAccount"></help-tip>
          <account-selector class="c-other-account" placeholder="Funding Account"
                            :modelValue="dc.otherAccount" :original="c.otherAccount"
                            @update:modelValue="c.otherAccount=$event"
          ></account-selector>
        </div>
    </div>
</template>

<script>
    import BalanceEditor from '../../lib/assetdb/components/BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector';
    import {commandIsValid, defaultedFundCommand, toGainstrack} from 'src/lib/commandDefaulting';

    export default {
        name: 'FundCommand',
        mixins: [CommandEditorMixin],
        components: {
            BalanceEditor,
            AccountSelector,
        },
        methods: {

        },
        computed: {
          dc() {
            const c = this.c;
            const stateEx = this.allStateEx;
            const fxConverter = this.fxConverter
            const dc = defaultedFundCommand(c, stateEx, fxConverter);
            return dc;
          },
            fundableAccounts() {
                const all = this.$store.state.allState.accounts;
                const acctMatch = /^(Assets|Liabilities)/;
                const scope = all.filter(x => acctMatch.test(x.accountId) && !x.options.generatedAccount);
                return scope.map(x => x.accountId).sort();
            },
            isValid() {
              return commandIsValid(this.dc)
            },
            toGainstrack() {
              return toGainstrack(this.dc);
            }
        }

    }
</script>

<style scoped>

</style>
