<template>
  <my-page padding>
    <q-tabs v-model="tab" inline-label class="bg-secondary text-white">
      <q-tab name="assets" :icon="matAssignment" label="Balance"></q-tab>
      <q-tab name="statement" :icon="matAccountBalance" label="Statements"></q-tab>
      <q-tab name="journal" :icon="matEdit" label="Journal" v-if="hasJournal"></q-tab>
      <q-tab name="more" :icon="matAssignment" label="More" v-if="hasJournal"></q-tab>
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="statement">
        <h6><a href="/gainstrack/command/get/">{{ accountId }}</a></h6>
        <div>
          <account-graph :accountId="accountId"></account-graph>
        </div>
        <div>
          <conversion-select></conversion-select>
        </div>

        <journal-table :entries="displayEntries" show-balance></journal-table>
      </q-tab-panel>

      <q-tab-panel name="journal">
        <account-journal :accountId="accountId"></account-journal>
      </q-tab-panel>

      <q-tab-panel name="assets">
        <asset-view :assetResponse="assetResponse" :loading="false" :account-id="accountId"></asset-view>
      </q-tab-panel>

      <q-tab-panel name="more">
        <asset-balance :account-id="accountId"></asset-balance>
      </q-tab-panel>

    </q-tab-panels>


  </my-page>
</template>

<script lang="ts">
  import axios from 'axios'
  import Vue from 'vue';
  import JournalTable from '../components/JournalTable.vue'
  import ConversionSelect from '../components/ConversionSelect.vue'
  import AccountGraph from '../components/AccountGraph.vue'
  import AccountJournal from '../components/AccountJournal.vue'
  import AssetView from '../components/AssetView.vue'
  import { mapGetters } from 'vuex'
  import { matAccountBalance, matAssignment, matEdit } from '@quasar/extras/material-icons'
  import AssetBalance from '../components/AssetBalance.vue'
  import { MyState } from 'src/store'
  import {
    postingsByCommand,
    commandPostingsWithBalance,
    CommandPostingsWithBalance,
    displayConvertedPositionSet, isSubAccountOf
  } from 'src/lib/utils';
  import {AccountDTO, Posting} from 'src/lib/models';

  export default Vue.extend({
    name: 'Account',
    components: {
      AccountGraph,
      ConversionSelect,
      JournalTable,
      AccountJournal,
      AssetView,
      AssetBalance,
    },
    props: ['accountId'],
    data () {
      return {
        assetResponse: {
          rows: [],
          columns: []
        },
        tab: 'assets',
        matAssignment,
        matEdit,
        matAccountBalance,
      }
    },
    computed: {
      ...mapGetters([
        'baseCcy',
        'findAccount',
        'mainAccounts',
        'reloadCounter',
        'allTxs',
        'fxConverter',
        'tradeFxConverter',
      ]),
      myAccount (): AccountDTO|undefined {
        return this.findAccount(this.accountId)
      },
      hasJournal ():boolean {
        return this.mainAccounts.includes(this.accountId)
      },
      conversion (): string {
        return this.$store.state.allState.conversion
      },
      entries(): CommandPostingsWithBalance[] {
        const state: MyState = this.$store.state;
        //const fxConverter: SingleFXConverter = this.fxConverter;
        const txs = this.allTxs;
        const cmds = state.allState.commands;
        // const baseCcy = state.allState.baseCcy;
        const res = postingsByCommand(txs, cmds, (p:Posting) => isSubAccountOf(p.account, this.accountId));
        return commandPostingsWithBalance(res);
      },
      displayEntries(): any {
        return [...this.entries].reverse().map(cp => {
          const postings = cp.postings;
          const conversion = this.conversion;
          const date = cp.cmd.date; // FIXME: tx dates may differ from cmd date!
          const change = displayConvertedPositionSet(cp.delta, this.baseCcy, conversion, date, this.myAccount, this.tradeFxConverter);
          const position = displayConvertedPositionSet(cp.balance, this.baseCcy, conversion, date, this.myAccount, this.tradeFxConverter);
          return {date: cp.cmd.date, cmdType: cp.cmd.commandType, description: cp.cmd.description, change, position, postings};
        })
      }
    },
    watch: {
      conversion () {
        this.refresh(this.accountId)
      },
      reloadCounter() {
        this.refresh(this.accountId)
      }
    },
    methods: {
      async refresh (path: string) {
        try {
          const res2 = await axios.get('/api/assets/' + path)
          this.assetResponse = res2.data
        } catch (error) {
          this.$notify.error(error)
        }
      }
    },
    mounted () {
      this.refresh(this.accountId)
    },
    beforeRouteUpdate (to, from, next) {
      // react to route changes...
      // don't forget to call next()
      this.refresh(to.params.accountId)
      next()
    }
  })
</script>

<style scoped>

</style>
