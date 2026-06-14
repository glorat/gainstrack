<template>
  <my-page padding>
    <q-tabs
      v-model="tab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
    >
      <q-tab name="basic" label="Basic" />
      <q-tab name="expenses" label="Expenses" />
      <q-tab name="income" label="Income" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="basic">
        <q-card class="">
          <q-card-section>
            Enter your annual income and expenses, and the current networth of your saved investment assets
          </q-card-section>
          <q-separator inset/>
          <q-card-section>
            <q-input label="Income" type="number" v-model.number="input.income"></q-input>
            <q-input label="Expenses" type="number" v-model.number="input.expenses"></q-input>
            <q-input label="Savings Rate" type="number" @update:modelValue="onSavingsRateChange($event)"
                     :modelValue="100*(input.income-input.expenses) / input.income" suffix="%"></q-input>
            <q-input label="Networth" type="number" v-model.number="input.networth"></q-input>
            <q-input label="Retirement target (multiples of annual expenses)" type="number"
                     v-model.number="strategy.expenseMultiple"></q-input>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="expenses">
        <q-card class="">
          <q-card-section>The following default assumptions can be adjusted</q-card-section>
          <q-separator inset/>
          <q-card-section>
            <q-input label="Inflation" type="number" v-model.number="strategy.inflation" suffix="%"></q-input>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="income">
        <q-card class="">
          <q-card-section>The following default assumptions can be adjusted</q-card-section>
          <q-separator inset/>
          <q-card-section>
            <q-input label="Return on investment" type="number" v-model.number="strategy.roi" suffix="%"></q-input>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <div v-if="targetYear">
      Your retirement objective will be met in year <span class="text-h3">{{ targetYear }}</span>
    </div>

    <q-table :rows="forecastEntries" :pagination="pagination" dense></q-table>
  </my-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ForecastStateEx, ModelSpec, performForecast } from 'src/lib/forecast/forecast';
import { LocalDate } from '@js-joda/core';
import { round } from 'lodash';
import { useForecastStore } from 'src/stores';

const forecastStore = useForecastStore();

const tab = ref('basic');
const pagination = { rowsPerPage: 30 };

const input = ref<{ timeunit: number; income: number; expenses: number; networth: number }>({
  timeunit: LocalDate.now().year(),
  income: 50000,
  expenses: 20000,
  networth: 0,
});

const strategy = ref<{ inflation: number; roi: number; expenseMultiple: number }>({
  inflation: 3,
  roi: 7,
  expenseMultiple: 25,
});

onMounted(() => {
  if (forecastStore.params) {
    input.value = forecastStore.params.input;
    strategy.value = forecastStore.params.strategy;
  }
  input.value.timeunit = LocalDate.now().year();
});

const forecastStrategy = computed(() => [
  { model: 'inflation', args: { inflation: strategy.value.inflation } },
  { model: 'wageInflation', args: { inflation: strategy.value.inflation } },
  { model: 'roi', args: { roi: strategy.value.roi } },
] as ModelSpec[]);

const forecastEntries = computed<ForecastStateEx[]>(() =>
  performForecast(input.value, forecastStrategy.value)
);

const targetYear = computed<number | undefined>(() =>
  forecastEntries.value.find(e => e.networth > e.expenses * strategy.value.expenseMultiple)?.timeunit
);

function onParamsUpdated() {
  const params = { input: input.value, strategy: strategy.value };
  forecastStore.updateForecastParams(params);
}

watch(input, () => { onParamsUpdated(); }, { deep: true });
watch(strategy, () => { onParamsUpdated(); }, { deep: true });

function onSavingsRateChange(ev: string | number | null) {
  const newRate = +(ev ?? 0);
  if (newRate > 0 && newRate <= 100) {
    input.value.expenses = round(input.value.income * ((100 - newRate) / 100));
  }
}
</script>

<style scoped>

</style>
