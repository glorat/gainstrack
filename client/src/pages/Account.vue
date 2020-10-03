<template>
  <my-page padding>
    <q-tabs v-model="tab" inline-label class="bg-secondary text-white" @input="onTabPanelChanged">
      <q-tab name="assets" :icon="matAssignment" label="Balance"></q-tab>
      <q-tab name="statement" :icon="matAccountBalance" label="Statements"></q-tab>
      <q-tab name="journal" :icon="matEdit" label="Journal" v-if="hasJournal" class="account-tab-journal"></q-tab>
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
  import Vue from 'vue';
  import JournalTable from '../components/JournalTable.vue'
  import ConversionSelect from '../components/ConversionSelect.vue'
  import AccountGraph from '../components/AccountGraph.vue'
  import AccountJournal from '../components/AccountJournal.vue'
  import AssetView from '../components/AssetView.vue'
  import {mapGetters} from 'vuex'
  import {matAccountBalance, matAssignment, matEdit} from '@quasar/extras/material-icons'
  import AssetBalance from '../components/AssetBalance.vue'
  import {MyState} from 'src/store'
  import {
    commandPostingsWithBalance,
    CommandPostingsWithBalance,
    displayConvertedPositionSet,
    isSubAccountOf,
    postingsByCommand
  } from 'src/lib/utils';
  import {AccountDTO, NetworthByAsset, Posting} from 'src/lib/models';
  import {LocalDate} from '@js-joda/core';
  import EventBus from 'src/event-bus';
  import {apiAssetsReport} from 'src/lib/apiFacade';

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
    data() {
      return {
        assetResponse: {
          rows: [] as NetworthByAsset[],
          columns: [] as Record<string, any>[],
          totals: [] as NetworthByAsset[],
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
        'allPostingsEx',
      ]),
      myAccount(): AccountDTO | undefined {
        return this.findAccount(this.accountId)
      },
      hasJournal(): boolean {
        return this.mainAccounts.includes(this.accountId)
      },
      conversion(): string {
        return this.$store.state.allState.conversion
      },
      entries(): CommandPostingsWithBalance[] {
        const state: MyState = this.$store.state;
        //const fxConverter: SingleFXConverter = this.fxConverter;
        const txs = this.allTxs;
        const cmds = state.allState.commands;
        // const baseCcy = state.allState.baseCcy;
        const res = postingsByCommand(txs, cmds, (p: Posting) => isSubAccountOf(p.account, this.accountId));
        return commandPostingsWithBalance(res);
      },
      displayEntries(): any {
        return [...this.entries].reverse().map(cp => {
          const postings = cp.postings;
          const conversion = this.conversion;
          const date = LocalDate.parse(cp.cmd.date); // FIXME: tx dates may differ from cmd date!
          const change = displayConvertedPositionSet(cp.delta, this.baseCcy, conversion, date, this.myAccount, this.tradeFxConverter);
          const position = displayConvertedPositionSet(cp.balance, this.baseCcy, conversion, date, this.myAccount, this.tradeFxConverter);
          return {
            date: cp.cmd.date,
            cmdType: cp.cmd.commandType,
            description: cp.cmd.description,
            change,
            position,
            postings
          };
        })
      }
    },
    watch: {
      conversion() {
        this.refresh()
      },
      reloadCounter() {
        this.refresh()
      }
    },
    methods: {
      onTabPanelChanged() {
        EventBus.$emit('account-tab-changed', this.tab);
      },
      async refresh (props?: Record<string, any>) {
        try {
          this.assetResponse = await apiAssetsReport(this.$store, props ?? this.$props);
        } catch (error) {
          console.error(error)
          this.$notify.error(error)
        }
      }
    },
    mounted() {
      this.refresh()
    },
    beforeRouteUpdate(to, from, next) {
      // react to route changes...
      // don't forget to call next()
      this.refresh(to.params)
      next()
    }
  })
</script>

<style scoped>

</style>
