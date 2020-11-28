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
    import {commandIsValid, defaultedTransferCommand, toGainstrack} from 'src/lib/commandDefaulting';

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
            const c = this.c;
            const stateEx = this.allStateEx;
            const fxConverter = this.fxConverter

            const dc = defaultedTransferCommand(c, stateEx, fxConverter);
            return dc;
          },
            transferableAccounts() {
                return this.mainAccounts;
            },
            isValid() {
              return commandIsValid(this.dc);
            },
            toGainstrack() {
              return toGainstrack(this.dc);
            }

        }
    }
</script>

<style scoped>

</style>
