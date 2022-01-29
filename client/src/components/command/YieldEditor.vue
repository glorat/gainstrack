<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector
            placeholder="Yield Source Account"
            class="c-account-id" :modelValue="dc.accountId" :original="c.accountId"
            @update:modelValue="c.accountId=$event" :account-list="assetAccounts"
          ></account-selector>        </div>
        <div v-if="multiAsset">
          <!-- TODO: Restrict this asset list to whatever is in this account -->
            <asset-id label="Asset that is yielding" :modelValue="dc.asset" :original="c.asset" @update:modelValue="$set(c, 'asset', $event)"></asset-id>
        </div>
        <div>
          <balance-editor label="Dividend/Interest/Yield" class="change" :modelValue="dc.change" :original="c.change" @update:modelValue="$set(c, 'change', $event)"></balance-editor>
        </div>
    </div>
</template>

<script>
    import AccountSelector from '../AccountSelector';
    import BalanceEditor from '../../lib/assetdb/components/BalanceEditor';
    import CommandDateEditor from '../CommandDateEditor';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AssetId from '../../lib/assetdb/components/AssetId';
    import {defaultedYieldCommand, toGainstrack} from 'src/lib/commandDefaulting';

    export default {
        name: 'YieldEditor',
        components: {AssetId, AccountSelector, BalanceEditor, CommandDateEditor},
        mixins: [CommandEditorMixin],
        methods: {

        },
        computed: {
          dc() {
            const stateEx = this.allStateEx;
            const fxConverter = this.fxConverter
            const dc = defaultedYieldCommand(this.c, stateEx, fxConverter);
            return dc;
          },
            multiAsset() {
                const acct = this.findAccount(this.c.accountId);
                return acct && acct.options.multiAsset;
            },
            assetAccounts() {
                return this.mainAssetAccounts;
            },
            isValid() {
              const c /*: AccountCommandDTO*/ = this.dc;
                return !!c.accountId
                    && c.change.number
                    && c.change.ccy
                    && (c.asset || !this.multiAsset);
            },
            toGainstrack() {
              return toGainstrack(this.dc)
            }
        }
    }
</script>

<style scoped>

</style>
