<template>
  <vue-plotly :data="mySeries" :layout="layout" :options="options" auto-resize></vue-plotly>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {VuePlotly} from 'src/lib/loader';
import {useAppStore} from 'src/stores';
import {
  isSubAccountOf,
  parentAccountIdOf, positionSetAdd,
  positionSetFx,
  postingsToPositionSet
} from 'src/lib/utils';
import {PostingEx} from 'src/lib/assetdb/models';
import { mapValues } from 'lodash';
import {reduce, some} from 'lodash';
import { LocalDate } from '@js-joda/core';

const props = defineProps<{
  height?: number
  negativeValues?: boolean
  accountId?: string
}>();

const store = useAppStore();

const myAccountIds = computed((): string[] => {
  const mainAccounts = ['Assets', 'Liabilities'];
  const networthAccountFilter = (acctId: string) => some(mainAccounts, ma => isSubAccountOf(acctId, ma));
  const filter = props.accountId ? (acctId: string) => isSubAccountOf(acctId, props.accountId!) : networthAccountFilter;

  return store.accountIds
    .filter(filter)
    .sort();
});

const positionsPerAccount = computed((): Record<string, Record<string, number>> => {
  const postings: PostingEx[] = store.allPostingsEx;
  const acctIds = myAccountIds.value;
  const ret: Record<string, Record<string, number>> = {};
  acctIds.forEach(acctId => {
    const myPs = postings.filter(p => p.account === acctId);
    let pSet = postingsToPositionSet(myPs);
    if (props.negativeValues) {
      pSet = mapValues(pSet, x => -x);
    }
    const pSetFloor = mapValues(pSet, x => Math.max(x, 0));
    ret[acctId] = pSetFloor;
  });
  return ret;
});

const mySeries = computed(() => {
  const acctIds = myAccountIds.value;
  const ids: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];
  const myDate = LocalDate.now();
  const pSetMap = positionsPerAccount.value;

  acctIds.forEach(acctId => {
    const subAccountIds = acctIds.filter(subId => isSubAccountOf(subId, acctId));
    const subPSets = subAccountIds.map(subId => pSetMap[subId]);
    const pset = reduce(subPSets, positionSetAdd, {});
    const value = positionSetFx(pset, store.baseCcy, myDate, store.fxConverter);
    const parentId = parentAccountIdOf(acctId);
    ids.push(acctId);
    if (parentId !== '' && ids.indexOf(parentId) < 0) {
      throw new Error(`${parentId} parent is not yet a node`);
    }
    parents.push(parentId);
    values.push(Math.max(value, 0));
  });

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
    hovertemplate: `%{id}<br>%{value:,f} ${store.baseCcy}<br>%{percentParent:.1%} of Parent<br>%{percentRoot:.1%} of Total`,
  }];
});

const layout = computed(() => ({
  margin: {l: 0, r: 0, b: 0, t: 0},
  height: props.height,
  autosize: true,
}));

const options = computed(() => ({
  displayModeBar: false,
  displaylogo: false,
}));
</script>

<style scoped>

</style>
