<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div>
            <account-selector v-model="c.accountId" :account-list="assetAccounts" @input="accountIdChanged"></account-selector>
        </div>
        <div v-if="multiAsset">
            Asset that is yielding
            <asset-id v-model="c.asset" @input="assetChanged"></asset-id>
        </div>
        <div>
            Dividend/Interest
            <balance-editor v-model="c.change"></balance-editor>
        </div>
    </div>
</template>

<script>
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from './BalanceEditor';
    import CommandDateEditor from '../CommandDateEditor';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AssetId from '../AssetId';

    export default {
        name: 'YieldEditor',
        components: {AssetId, AccountSelector, BalanceEditor, CommandDateEditor},
        mixins: [CommandEditorMixin],
        methods: {
            accountIdChanged() {
                const acct = this.findAccount(this.c.accountId);
                if (acct && acct.options.fundingAccount) {
                    const fundAcct = this.findAccount(acct.options.fundingAccount);
                    if (fundAcct) {
                        // TODO: A test case would show that the PP account would yield GBP
                        this.c.change.ccy = fundAcct.ccy;
                    }
                } else if (acct) {
                    // TODO: A test case would show that a GBP savings account would yield GBP
                    this.c.change.ccy = acct.ccy;
                }
            },
            assetChanged() {
                // TODO: A test case of VWRL yielding USD instead of GBP
                const cmds = this.$store.state.summary.commands;
                const prev = cmds.find(cmd => cmd.commandType === 'yield' && cmd.asset === this.c.asset);
                if (prev) {
                    this.c.change.ccy = prev.change.ccy
                }
            },
        },
        computed: {
            multiAsset() {
                const acct = this.findAccount(this.c.accountId);
                return acct && acct.options.multiAsset;
            },
            assetAccounts() {
                return this.mainAssetAccounts;
            },
            isValid() {
                return !!this.c.accountId
                    && this.c.change.number
                    && this.c.change.ccy
                    && (this.c.asset || !this.c.multiAsset);
            },
            toGainstrack() {
                if (this.isValid) {
                    if (this.multiAsset) {
                        return `${this.c.date} yield ${this.c.accountId} ${this.c.asset} ${this.c.change.number} ${this.c.change.ccy}`;
                    } else {
                        return `${this.c.date} yield ${this.c.accountId} ${this.c.change.number} ${this.c.change.ccy}`
                    }
                }
            }
        }
    }
</script>

<style scoped>

</style>
