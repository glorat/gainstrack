<template>
  <div>
    <div>
      <command-date-editor v-model="c.date"></command-date-editor>
    </div>
    <div v-if="!hideAccount">
      <account-selector class="c-account-id" :value="dc.accountId" :original="c.accountId"
                        @input="c.accountId=$event" :account-list="balanceableAccounts"></account-selector>
    </div>
    <div>
      <balance-editor label="Balance" class="c-balance" :value="dc.balance" :original="c.balance" @input="c.balance=$event"></balance-editor>
    </div>
    <div v-if="canUnit">
      <q-radio :value="dc.commandType" @input="c.commandType=$event" val="bal" label="Simple Balance" />
      <q-radio :value="dc.commandType" @input="c.commandType=$event" val="unit" label="With Cost" />
    </div>

    <div v-if="dc.commandType==='bal'">
      <help-tip tag="balOtherAccount"></help-tip>
      <account-selector class="c-other-account" placeholder="Adjustment Account"
                        :value="dc.otherAccount" :original="c.otherAccount"
                        @input="c.otherAccount=$event" :account-list="mainAccounts"></account-selector>
    </div>
    <div v-if="dc.commandType==='unit'">
      Price
      <balance-editor :value="dc.price" :original="c.price" @input="c.price=$event"></balance-editor>
    </div>
  </div>
</template>

<script>
  // import {AccountCommandDTO, AccountDTO} from '@/models';
  import BalanceEditor from './BalanceEditor.vue';
  import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
  import AccountSelector from '../AccountSelector.vue';
  import Vue from 'vue';
  import { positionUnderAccount } from 'src/lib/utils'
  import { LocalDate } from '@js-joda/core'
  import { GlobalPricer } from 'src/lib/pricer'


  // interface MyData {
  //     c: AccountCommandDTO
  // }

  export default Vue.extend({
    name: 'BalanceOrUnit',
    props: {cmd: Object},
    mixins: [CommandEditorMixin],
    components: {
      BalanceEditor,
      AccountSelector,
    },
    methods: {
      accountIdChanged() {
        // const acct = this.findAccount(this.c.accountId);
        // if (acct) {
        //   this.c.balance.ccy = acct.ccy;
        // }
        // const allCmds /*: AccountCommandDTO[]*/ = this.$store.state.allState.commands;
        // const prev = allCmds.find(
        //   x => x.accountId === this.c.accountId && x.commandType === 'bal');
        // if (prev) {
        //   this.c.otherAccount = prev.otherAccount;
        //   // A better than nothing heurstic - using the actual balance of this date would be better
        //   this.c.balance.number = prev.balance.number;
        // } else {
        //   this.c.otherAccount = 'Equity:Opening'
        // }
      },
    },
    computed: {
      dc() {
        // Take care to use copy-on-write pattern in this function
        const dc = {...this.c};
        const acct = this.findAccount(dc.accountId);

        if (acct) {
          if (!dc.balance.ccy) {dc.balance = {...dc.balance, ccy : acct.ccy}}

          if (!dc.commandType || !/^(bal|unit)$/.test(dc.commandType)) {
            if (GlobalPricer.isIso(dc.balance.ccy) || dc.balance.ccy == acct.ccy) {
              dc.commandType = 'bal'
            } else {
              dc.commandType = 'unit'
            }
          }
          if (!dc.balance.number) {
            const stateEx = this.allStateEx;
            const pex = stateEx.allPostingsEx();
            const pos = positionUnderAccount(pex, dc.accountId);
            const number = GlobalPricer.trim(pos[dc.balance.ccy]);
            dc.balance = {...dc.balance, number}
          }

          const underCcy = this.allStateEx.underlyingCcy(dc.balance.ccy, dc.accountId);
          if (!dc.price.ccy && !dc.price.number && underCcy) {
            const fxConverter = this.fxConverter
            const dt = LocalDate.parse(dc.date);
            const priceNumber = fxConverter.getFXTrimmed(dc.balance.ccy, underCcy, dt);

            dc.price = {ccy: underCcy, number: priceNumber};
          }

          if (dc.commandType === 'bal' && !dc.otherAccount) {
            const allCmds /*: AccountCommandDTO[]*/ = [...this.$store.state.allState.commands].reverse();
            const prev = allCmds.find(
              x => x.accountId === dc.accountId && x.commandType === 'bal');
            if (prev) {
              dc.otherAccount = prev.otherAccount;
            } else {
              dc.otherAccount = 'Equity:Opening'
            }
          }

          if (!dc.commandType) {
            dc.commandType = 'bal';
          }

        }
        return dc;
      },
      mainAccount() {
        return this.findAccount(this.dc.accountId);
      },
      balanceableAccounts() {
        return this.$store.state.allState.accounts.filter(acct => {
          const id = acct.accountId;
          const t = (/^(Asset|Liabilities|Equity)/.test(id));
          return (acct.options.generatedAccount === false) && t
        }).map( a => a.accountId).sort()
      },
      canUnit() {
        const acct = this.mainAccount;
        if (!acct) return false;
        return acct.options.multiAsset;
      },
      isValid() /*: boolean*/ {
        const c = this.dc;
        // lint-ignore
        // FIXME: Or price
        if (c.commandType === 'bal')
          return c.accountId && c.date && c.balance && c.balance.number!==undefined && c.balance.ccy && c.otherAccount;
        else
          return c.accountId && c.date && c.balance && c.balance.number!==undefined && c.balance.ccy && c.price?.ccy && c.price?.number;
      },
      toGainstrack() /*: string*/ {
        if (this.isValid) {
          const c /*: AccountCommandDTO*/ = this.dc;
          if (c.commandType === 'bal') {
            return `${c.date} bal ${c.accountId} ${c.balance.number} ${c.balance.ccy} ${c.otherAccount}`;
          } else if (c.commandType === 'unit') {
            return `${c.date} unit ${c.accountId} ${c.balance.number} ${c.balance.ccy} @${c.price.number} ${c.price.ccy}`;
          } else {
            throw new Error ('Unknown commandType')
          }

        } else {
          return '';
        }
      }
    },

  });
</script>

<style scoped>

</style>
