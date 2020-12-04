<template>
  <vue-plotly :data="mySeries" :layout="layout" :options="options" auto-resize></vue-plotly>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {VuePlotly} from 'src/lib/loader';
  import {mapGetters} from 'vuex';
  import {
    isSubAccountOf,
    parentAccountIdOf, positionSetAdd,
    positionSetFx,
    postingsToPositionSet
  } from 'src/lib/utils';
  import {PostingEx} from 'src/lib/models';
  import { mapValues } from 'lodash';
  import {reduce, some} from 'lodash';
  import { LocalDate } from '@js-joda/core';

  export default Vue.extend({
    name: 'NetworthSunburst',
    components: {VuePlotly},
    props: {
      height: Number,
      negativeValues: Boolean,
      accountId: String,
    },
    computed: {
      ...mapGetters([
        'allTxs',
        'fxConverter',
        'baseCcy',
        'accountIds',
        'allPostingsEx',
      ]),
      myAccountIds():string[] {
        const mainAccounts = ['Assets', 'Liabilities'];
        const networthAccountFilter : ((acctId:string)=>boolean) = acctId => some(mainAccounts, ma => isSubAccountOf(acctId, ma));
        const filter:((acctId:string)=>boolean) = this.accountId ? (acctId => isSubAccountOf(acctId, this.accountId)) : networthAccountFilter;

        return this.accountIds
          .filter(filter)
          .sort()
      },
      positionsPerAccount():Record<string, Record<string,number>> {

        const postings: PostingEx[] = this.allPostingsEx;
        const acctIds = this.myAccountIds;
        const ret:Record<string, Record<string,number>> = {};
        acctIds.forEach(acctId => {
          const myPs = postings.filter(p => p.account === acctId); // TODO: Date filter
          let pSet = postingsToPositionSet(myPs);
          // This will pick up liabilities (or negative assets)
          if (this.negativeValues) {
            pSet = mapValues(pSet, x => -x);
          }
          // Only accept positive values
          const pSetFloor = mapValues(pSet, x => Math.max(x,0));
          ret[acctId] = pSetFloor
        });
        return ret;
      },
      mySeries():any {
        const acctIds = this.myAccountIds;

        let ids:string[] = [];
        let parents:string[] = [];
        let values:number[] = [];
        const myDate = LocalDate.now();
        const pSetMap = this.positionsPerAccount;
        acctIds.forEach(acctId => {
          const subAccountIds = acctIds.filter(subId => isSubAccountOf(subId, acctId));
          const subPSets = subAccountIds.map(subId => pSetMap[subId]);
          const pset = reduce(subPSets, positionSetAdd, {});
          const value = positionSetFx(pset, this.baseCcy, myDate, this.fxConverter);
          const parentId = parentAccountIdOf(acctId);
          ids.push(acctId);
          if (parentId!=='' && ids.indexOf(parentId) < 0) {
            throw new Error(`${parentId} parent is not yet a node`);
          }
          parents.push(parentId);
          values.push(Math.max(value,0)); // Can't show negatives
        });
        //
        // console.log(labels);
        // console.log(parents);
        // console.log(values);

        const labels = ids.map(id => id.split(':').pop());

        return [{
          type: 'sunburst',
          ids,
          labels,
          parents,
          values,
          outsidetextfont: {size: 20, color: '#377eb8'},
          leaf: {opacity: 0.4},
          marker: {line: {width: 2}},
          branchvalues: 'total',
          hovertemplate: `%{id}<br>%{value:,f} ${this.baseCcy}<br>%{percentParent:.1%} of Parent<br>%{percentRoot:.1%} of Total`,
        }]
      },
      layout(): any {
        return {
          // plot_bgcolor:'black',
          // paper_bgcolor:'black',
          margin: {l: 0, r: 0, b: 0, t: 0},
          height: this.height,
          autosize: true
        }

      },
      options(): any {
        return {
          displayModeBar: false,
          displaylogo: false
        }
      },

    }
  })
</script>

<style scoped>

</style>
