<template>
    <div>
        <div>
            <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div v-if="!hideAccount">
          <account-selector
            placeholder="Yield Source Account"
            class="c-account-id" :value="dc.accountId" :original="c.accountId"
            @input="c.accountId=$event" :account-list="assetAccounts"
          ></account-selector>        </div>
        <div v-if="multiAsset">
          <!-- TODO: Restrict this asset list to whatever is in this account -->
            <asset-id label="Asset that is yielding" v-model="c.asset" @input="assetChanged"></asset-id>
        </div>
        <div>
          <balance-editor label="Dividend/Interest/Yield" class="change" :value="dc.change" :original="c.change" @input="c.change=$event"></balance-editor>
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
          inferredChangeCcy(asset) {
            const acct = this.findAccount(this.c.accountId);
            if (acct.options.multiAsset && asset) {
              const cmds = this.$store.state.allState.commands;
              const prev = cmds.reverse().find(cmd => cmd.commandType === 'yield' && cmd.asset === asset);
              if (prev) {
                return prev.change.ccy
              } else {
                const under = this.allStateEx.underlyingCcy(asset, this.c.accountId)
                if (under) return under;
              }
            }

            if (acct && acct.options.fundingAccount) {
              const fundAcct = this.findAccount(acct.options.fundingAccount);
              if (fundAcct) {
                // TODO: A test case would show that the PP account would yield GBP
                return fundAcct.ccy;
              }
            } else if (acct) {
              // TODO: A test case would show that a GBP savings account would yield GBP
              return acct.ccy;
            }
          }
        },
        computed: {
          dc() {
            const dc = {...this.c};
            if (!dc.change.ccy) {
              const changeCcy = this.inferredChangeCcy(dc.asset);
              dc.change = {...dc.change, ccy: changeCcy};
            }
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
                    && (c.asset || !c.multiAsset);
            },
            toGainstrack() {
              const c /*: AccountCommandDTO*/ = this.dc;
                if (this.isValid) {
                    if (this.multiAsset) {
                        return `${c.date} yield ${c.accountId} ${c.asset} ${c.change.number} ${c.change.ccy}`;
                    } else {
                        return `${c.date} yield ${c.accountId} ${c.change.number} ${c.change.ccy}`
                    }
                } else {
                    return '';
                }
            }
        }
    }
</script>

<style scoped>

</style>
