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
  import {commandIsValid, defaultedBalanceOrUnit} from 'src/lib/commandDefaulting';


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
        const c = this.c;
        const stateEx = this.allStateEx;
        const fxConverter = this.fxConverter
        const dc = defaultedBalanceOrUnit(c, stateEx, fxConverter);
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
        return commandIsValid(c);
        // lint-ignore
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
