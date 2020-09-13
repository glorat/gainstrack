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
    displayConvertedPositionSet, isSubAccountOf, positionUnderAccount
  } from 'src/lib/utils';
  import {AccountDTO, NetworthByAsset, Posting, PostingEx} from 'src/lib/models';
  import {SingleFXConverter} from 'src/lib/fx';
  import {date} from 'quasar';
  import formatDate = date.formatDate;
  import {fromISO} from "src/lib/SortedColumnMap";
  import {add, isAfter, max, setDayOfYear, sub} from "date-fns";
  import { groupBy, maxBy } from 'lodash';

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
          const localCompute = true;
          if (!localCompute) {
            const res2 = await axios.get('/api/assets/' + path)
            this.assetResponse = res2.data
          } else
            {
            // Gather dependencies
            const allPostings: PostingEx[] = this.allPostingsEx;
            const pricer:SingleFXConverter = this.fxConverter;
            const baseCcy = this.baseCcy;
            const date = formatDate(Date.now(), 'YYYY-MM-DD');

            // Compute our report
            const pSet = positionUnderAccount(allPostings, path);
            const rows = Object.entries(pSet).map(([assetId, units]) => {
              const price = pricer.getFX(assetId, baseCcy, date) ?? 0;
              const value = price * units;
              const priceDate = pricer.latestDate(assetId, baseCcy, date);
              const priceMoves = {} as Record<string, number>;
              return {
                assetId, units, value, price, priceDate, priceMoves
              }
            });
            const totalValue = rows.map(row=> row.value).reduce((a,b)=>a+b);
            const allDates:Date[] = rows.map(row => row.priceDate ?? '').map(fromISO).filter(x => x !== undefined);
            let columns: any[] = [];
            let baseDate:string = '';
            if (allDates.length > 0) {
              const maxDate = max(allDates);
              // const cutOff = sub(maxDate, {days: 4});
              // const recentDts = allDates.filter(dt => isAfter(dt, cutOff))
              // const bestDate:Date = maxBy(Object.entries(groupBy(recentDts)), x => x[1].length)[0]
              // console.error(bestDate);
              // It just isn't as concise outside of Scala to get a most common element!
              const bestDate = maxDate
              const dates = [
                sub(bestDate, {days: 1}),
                sub(bestDate, {weeks: 1}),
                sub(bestDate, {months: 1}),
                sub(bestDate, {months: 3}),
                sub(bestDate, {years: 1}),
                setDayOfYear(bestDate, 1),
              ].map(x => x.toISOString().substr(0, 10));
              const tenors = ['1d', '1w', '1m', '3m', '1y', 'YTD'];
              columns = [
                {
                  "name": "1d", "label": "1d", "value": dates[0], "tag": "priceMove"
                }, {
                  "name": "1w",
                  "label": "1w",
                  "value": dates[1],
                  "tag": "priceMove"
                }, {"name": "1m", "label": "1m", "value": dates[2], "tag": "priceMove"}, {
                  "name": "3m",
                  "label": "3m",
                  "value": dates[3],
                  "tag": "priceMove"
                }, {"name": "1y", "label": "1y", "value": dates[4], "tag": "priceMove"}, {
                  "name": "YTD",
                  "label": "YTD",
                  "value": dates[5],
                  "tag": "priceMove"
                }];


              // withPriceMoves
              baseDate = bestDate.toISOString().substr(0, 10);
              rows.forEach(row => {
                let priceMoves: Record<string, number> = {};
                columns.forEach(col => {
                  const basePrice = pricer.getFX(row.assetId, baseCcy, baseDate);
                  const datePrice = pricer.getFX(row.assetId, baseCcy, col.value)
                  if (basePrice && datePrice && basePrice !== 0.0) {
                    priceMoves[col.name] = (basePrice-datePrice)/datePrice;
                  }

                })
                row.priceMoves = priceMoves;
              });
            }



            const totals = [{assetId: 'TOTAL', value: totalValue, price:0, priceDate: baseDate, priceMoves:{}, units:0}];
            this.assetResponse = {rows, columns, totals};
            // this.assetResponse.rows = rows;
          }


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
