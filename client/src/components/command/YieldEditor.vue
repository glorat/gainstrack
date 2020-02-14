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
            <asset-id v-model="c.asset"></asset-id>
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
        data() {
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.change = c.change || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            c.asset = c.asset || '';
            return {c};
        },
        methods: {
            accountIdChanged() {
                const acct = this.findAccount(this.c.accountId)
                if (acct) {
                    this.c.change.ccy = acct.ccy;
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