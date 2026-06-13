<template>
    <vue-plotly :data="mySeries" :layout="layout" :options="options" auto-resize></vue-plotly>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VuePlotly } from '../lib/loader';
import {useAppStore} from 'src/stores';
import {AccountDTO, Posting} from 'src/lib/assetdb/models';
import {
  convertedPositionSet,
  postingsByDate,
  postingsToPositionSet,
  positionSetAdd,
  isSubAccountOf
} from 'src/lib/utils';
import { keys, flatten, uniq } from 'lodash';
import {LocalDate} from '@js-joda/core';

const props = defineProps<{ accountId: string }>();

const store = useAppStore();

const layout = {
  autosize: true,
  showlegend: true,
  xaxis: {nticks: 20},
  yaxis: {zeroline: true, hoverformat: ',.0f'},
  height: 250,
  margin: {l: 30, r: 30, b: 30, t: 30, pad: 0},
};

const options = {displaylogo: false};

const myPostingsByDate = computed(() => {
  const txs = store.allTxs;
  return postingsByDate(txs, (p: Posting) => isSubAccountOf(p.account, props.accountId));
});

const myAccount = computed((): AccountDTO | undefined => store.findAccount(props.accountId));

const mySeries = computed(() => {
  const account = myAccount.value;
  const conversion = store.conversion;
  const pByDate = myPostingsByDate.value;
  let poses: any[] = [];
  let pSetSoFar = {};
  for (let i = 0; i < pByDate.dates.length; i++) {
    const posting = pByDate.postings[i];
    const pos = postingsToPositionSet(posting);
    const date = LocalDate.parse(pByDate.dates[i]);
    pSetSoFar = positionSetAdd(pos, pSetSoFar);
    const pset = convertedPositionSet(pSetSoFar, store.baseCcy, conversion, date, account, store.fxConverter);
    poses.push(pset);
  }

  const ccys = uniq(flatten(poses.map(pos => keys(pos))));
  const ret: Record<string, any>[] = [];
  ccys.forEach(ccy => {
    const name = ccy;
    const x = pByDate.dates;
    const y = poses.map(pset => pset[name]);
    const type = 'scatter';
    ret.push({name, x, y, type});
  });
  return ret;
});
</script>

<style scoped>

</style>
