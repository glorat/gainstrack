<template>
    <div>
        <div>
          <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
            <account-selector class="c-account-id" v-model="c.accountId" v-on:input="accountIdChanged" :account-list="balanceableAccounts"></account-selector>
        </div>
        <div>
            <balance-editor label="Balance" class="c-balance" v-model="c.balance"></balance-editor>
        </div>
        <div>
            <help-tip tag="balOtherAccount"></help-tip>
            <account-selector class="c-other-account" placeholder="Adjustment Account" v-model="c.otherAccount" :account-list="mainAccounts"></account-selector>
        </div>
    </div>
</template>

<script>
    // import {AccountCommandDTO, AccountDTO} from '@/models';
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AccountSelector from '../AccountSelector.vue';
    import Vue from 'vue';


    // interface MyData {
    //     c: AccountCommandDTO
    // }

    export default Vue.extend({
        name: 'BalanceStatement',
        props: {cmd: Object},
        mixins: [CommandEditorMixin],
        components: {
            BalanceEditor,
            AccountSelector,
        },
        methods: {
            accountIdChanged() {
                const acct = this.findAccount(this.c.accountId);
                if (acct) {
                    this.c.balance.ccy = acct.ccy;
                }
                const allCmds /*: AccountCommandDTO[]*/ = this.$store.state.allState.commands;
                const prev = allCmds.find(
                    x => x.accountId === this.c.accountId && x.commandType === 'bal');
                if (prev) {
                    this.c.otherAccount = prev.otherAccount;
                    // A better than nothing heurstic - using the actual balance of this date would be better
                    this.c.balance.number = prev.balance.number;
                } else {
                    this.c.otherAccount = 'Equity:Opening'
                }
            },
        },
        computed: {
            balanceableAccounts() {
                return this.$store.state.allState.accounts.filter(acct => {
                    const id = acct.accountId;
                    const t = (/^(Asset|Liabilities|Equity)/.test(id));
                    return (acct.options.generatedAccount === false) && t
                }).map( a => a.accountId).sort()
            },
            isValid() /*: boolean*/ {
                const c = this.c;
                // lint-ignore
                return c.accountId && c.date && c.balance && c.balance.ccy && c.otherAccount;
            },
            toGainstrack() /*: string*/ {
                if (this.isValid) {
                    const c /*: AccountCommandDTO*/ = this.c;
                    // lint-ignore
                    return `${c.date} bal ${c.accountId} ${c.balance.number} ${c.balance.ccy} ${c.otherAccount}`;
                } else {
                    return '';
                }
            }
        },

    });
</script>

<style scoped>

</style>
