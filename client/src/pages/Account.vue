<template>
  <my-page padding>
    <q-tabs v-model="tab" inline-label class="bg-secondary text-white">
      <q-tab name="assets" :icon="matAssignment" label="Balance"></q-tab>
      <q-tab name="statement" :icon="matAccountBalance" label="Statements"></q-tab>
      <q-tab name="journal" :icon="matEdit" label="Journal" v-if="hasJournal"></q-tab>
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

        <journal-table :entries="info.rows" show-balance></journal-table>
      </q-tab-panel>

      <q-tab-panel name="journal">
        <account-journal :accountId="accountId"></account-journal>
      </q-tab-panel>

      <q-tab-panel name="assets">
        <asset-view :assetResponse="assetResponse" :loading="false"></asset-view>
      </q-tab-panel>

    </q-tab-panels>


  </my-page>
</template>

<script>
  import axios from 'axios'
  import JournalTable from '../components/JournalTable.vue'
  import ConversionSelect from '../components/ConversionSelect.vue'
  import AccountGraph from '../components/AccountGraph.vue'
  import AccountJournal from '../components/AccountJournal.vue'
  import AssetView from '../components/AssetView.vue'
  import { mapGetters } from 'vuex'
  import { matAccountBalance, matAssignment, matEdit } from '@quasar/extras/material-icons'

  export default {
    name: 'Account',
    components: {
      AccountGraph,
      ConversionSelect,
      JournalTable,
      AccountJournal,
      AssetView
    },
    props: ['accountId'],
    data () {
      return {
        info: {
          accountId: 'Loading...',
          rows: []
        },
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
        'mainAccounts',
        'reloadCounter',
      ]),
      hasJournal () {
        return this.mainAccounts.includes(this.accountId)
      },
      conversion () {
        return this.$store.state.summary.conversion
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
      async refresh (path) {
        try {
          const response = await axios.get('/api/account/' + path)
          this.info = response.data
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
  }
</script>

<style scoped>

</style>
