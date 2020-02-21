<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div>
            <account-selector class="c-account-id" v-model="c.accountId" :account-list="earnableAccounts" @input="accountIdChanged"></account-selector>
        </div>
        <div>
            Earnings
            <balance-editor class="c-change" v-model="c.change"></balance-editor>
        </div>
    </div>
</template>

<script>
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from './BalanceEditor';
    import CommandDateEditor from '../CommandDateEditor';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';

    export default {
        name: 'EarnEditor',
        components: {AccountSelector, BalanceEditor},
        mixins: [CommandEditorMixin],
        methods: {
            accountIdChanged() {
                const acct = this.findAccount(this.c.accountId)
                if (acct) {
                    this.c.change.ccy = acct.ccy;
                }
            },
        },
        computed: {
            earnableAccounts() {
                return this.mainAccounts.filter(x => x.startsWith('Income:'));
            },
            isValid() {
                return !!this.c.accountId
                    && this.c.change.number
                    && this.c.change.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                    const tag = this.c.accountId.substring(7);
                    return `${this.c.date} earn ${tag} ${this.c.change.number} ${this.c.change.ccy}`;
                }
            }
        },
    }
</script>

<style scoped>

</style>