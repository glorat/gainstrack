<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div>
          <account-selector class="c-account-id" placeholder="Source Account"
                            :value="dc.accountId" :original="c.accountId"
                            @input="c.accountId=$event" :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
          <balance-editor label="Transfer Amount" class="c-change" :value="dc.change" :original="c.change" @input="c.change=$event"></balance-editor>
        </div>
        <div>
          <account-selector class="c-other-account" placeholder="Target Account"
                            :value="dc.otherAccount" :original="c.otherAccount"
                            @input="c.otherAccount=$event" :account-list="transferableAccounts"></account-selector>

        </div>
        <div>
          <balance-editor label="Target Amount" class="c-options-target-change"
                          :value="dc.options.targetChange" :original="c.options.targetChange || {}" @input="c.options.targetChange=$event"
                          ></balance-editor>
        </div>


    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector';
    import { LocalDate } from '@js-joda/core'

    export default {
        name: 'Transfer',
        props: {cmd: Object},
        components: {
            BalanceEditor,
            AccountSelector,
        },
        mixins: [CommandEditorMixin],
        methods: {
        },
        computed: {
          dc() {
            const dc = {...this.c};
            const acct = this.findAccount(this.c.accountId);
            if (acct) {
              if (!dc.change.ccy) dc.change = {...dc.change, ccy: acct.ccy}
            }
            const other = this.findAccount(this.c.otherAccount);

            if (!dc.options || !dc.options.targetChange) {
              dc.options = {targetChange: {number: 0, ccy: ''}};
            }

            if (other) {
              if (!dc.options.targetChange.ccy) dc.options.targetChange = {...dc.options.targetChange, ccy: other.ccy}
            }

            if (!dc.options.targetChange.number) {
              const dt = LocalDate.parse(dc.date);
              const fxConverter = this.fxConverter;
              const fx = fxConverter.getFXTrimmed(dc.change.ccy, dc.options.targetChange.ccy, dt);
              const number = fx * dc.change.number;
              dc.options.targetChange = {...dc.options.targetChange, number}
            }
            return dc;
          },
            transferableAccounts() {
                return this.mainAccounts;
            },
            isValid() {
                const c = this.dc;
                return c.accountId
                    && c.otherAccount
                    && c.change.number
                    && c.options.targetChange.number
                    && c.change.ccy
                    && c.options.targetChange.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                    const c = this.dc;
                    let baseStr = `${c.date} tfr ${c.accountId} ${c.otherAccount} ${c.change.number} ${c.change.ccy}`;
                    if (c.change.number !== c.options.targetChange.number
                        || c.change.ccy !== c.options.targetChange.ccy) {
                        baseStr += ` ${c.options.targetChange.number} ${c.options.targetChange.ccy}`;
                    }
                    return baseStr;
                } else {
                    return '';
                }
            }
        }
    }
</script>

<style scoped>

</style>
