<template>
  <my-page padding>
    <div class="row">
      <div v-for="series in prices" class="col-lg-4">
        <template v-if="prices.length>0">
          <h6>{{ series.name }}</h6>
          <table class="sortable" style="margin: 5px">
            <thead>
            <tr>
              <th data-sort="string" data-sort-default="desc" data-order="asc">Date</th>
              <th data-sort="num">Trade Price</th>
              <th data-sort="num" v-if="series.cvalues[0]">Market Price</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(date, index) in series.dates">
              <td>{{ date }}</td>
              <td class="num">{{ series.values[index] }} {{ series.unit }}</td>
              <td class="num" v-if="series.cvalues[0]">{{ series.cvalues[index] }} {{ series.unit }}
              </td>
            </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>

  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { SingleFXConverter } from '../lib/fx';
import { useAppStore } from 'src/stores';
import { LocalDate } from '@js-joda/core';
import { qnotify } from 'src/boot/notify';

interface Price {
  name: string
  unit: string
  dates: string[]
  values: number[]
  cvalues: (number | undefined)[]
  cvalues2: (number | undefined)[]
}

const store = useAppStore();
const prices = ref<Price[]>([]);

function fxConverter(): SingleFXConverter {
  return store.fxConverter as SingleFXConverter;
}

function reloadQuotes() {
  const fx = fxConverter();
  prices.value.forEach(price => {
    const cvalues2 = price.dates.map(dt => {
      const val = fx.getFX(price.name.split('/')[0], price.name.split('/')[1], LocalDate.parse(dt));
      return val ? Math.round(val * 100) / 100 : undefined;
    });
    price['cvalues2'] = cvalues2;
  });
}

const quotes = computed(() => store.quotes);
watch(quotes, () => { reloadQuotes(); }, { deep: true });

onMounted(() => {
  try {
    reloadQuotes();
  } catch (error) {
    const e: any = error;
    qnotify.error(e?.toString());
  }
});
</script>

<style scoped>

</style>
