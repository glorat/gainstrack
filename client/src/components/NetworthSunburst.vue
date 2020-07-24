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
    positionUnderAccount,
    postingsToPositionSet
  } from 'src/lib/utils';
  import {AccountDTO, PostingEx} from 'src/lib/models';
  import {date} from 'quasar';
  import { mapValues } from 'lodash';
  import {reduce} from 'lodash';

  export default Vue.extend({
    name: 'NetworthSunburst',
    components: {VuePlotly},
    computed: {
      ...mapGetters([
        'findAccount',
        'allTxs',
        'fxConverter',
        'baseCcy',
        'accountIds',
        'allPostingsEx',
      ]),
      myAccountIds():string[] {
        return this.accountIds
          // networth filter: FIXME: pull to lib and test
          .filter((acctId:string) => isSubAccountOf(acctId, 'Assets') || isSubAccountOf(acctId, 'Liabilities'))
          .sort()
      },
      positionsPerAccount():Record<string, Record<string,number>> {
        const postings: PostingEx[] = this.allPostingsEx;
        const acctIds = this.myAccountIds;
        const ret:Record<string, Record<string,number>> = {};
        acctIds.forEach(acctId => {
          const myPs = postings.filter(p => p.account === acctId); // TODO: Date filter
          const pSet = postingsToPositionSet(myPs);
          const pSetFloor = mapValues(pSet, x => Math.max(x,0));
          ret[acctId] = pSetFloor
        });
        return ret;
      },
      mySeries() {
        const postings: PostingEx[] = this.allPostingsEx;

        const acctIds = this.myAccountIds;

        let ids:string[] = [];
        let parents:string[] = [];
        let values:number[] = [];
        const myDate = date.formatDate(Date.now(), 'YYYY-MM-DD');
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
        const labels = ids.map(id => id.replace('Assets:',''));

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
          height: 480,
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
