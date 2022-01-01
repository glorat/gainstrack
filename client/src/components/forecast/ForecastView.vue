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
            <q-input label="Savings Rate" type="number" v-on:input="onSavingsRateChange($event)"
                     :value="100*(input.income-input.expenses) / input.income" suffix="%"></q-input>
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

    <q-table :data="forecastEntries" :pagination="pagination" dense></q-table>
  </my-page>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import {ForecastStateEx, ModelSpec, performForecast} from 'src/lib/forecast/forecast';
import {LocalDate} from '@js-joda/core';
import {round} from 'lodash';

export default defineComponent({
  name: 'ForecastView',
  data() {
    const income = 50000;
    const expenses = 20000;
    const networth = 0;
    const timeunit = LocalDate.now().year();
    const tab = 'basic';

    const input = {
      timeunit,
      income,
      expenses,
      networth
    };
    const strategy = {inflation: 3, roi: 7, expenseMultiple: 25};

    const pagination = {rowsPerPage: 30};
    return {tab, input, pagination, strategy};

  },
  computed: {
    forecastEntries(): ForecastStateEx[] {
      let entries = performForecast(this.input, this.forecastStrategy);
      return entries;
    },
    targetYear(): number|undefined {
      return this.forecastEntries.find(e => e.networth > e.expenses * this.strategy.expenseMultiple)?.timeunit
    },
    forecastStrategy(): ModelSpec[] {
      return [
        {model: 'inflation', args: {inflation: this.strategy.inflation}},
        {model: 'roi', args: {roi: this.strategy.roi}},
      ]
      // const rate = (rate: number) => (base: number) => round(base * rate);
      // return {
      //   roi: rate(this.strategy.roi / 100),
      //   inflation: rate(this.strategy.inflation / 100),
      //   retirementTarget: state => state.networth > state.expenses * this.strategy.expenseMultiple
      // };

    }
  },
  methods: {
    onSavingsRateChange(ev: string | number) {
      const newRate = +ev;
      if (newRate > 0 && newRate <= 100) {
        this.input.expenses = round(this.input.income * ((100 - newRate) / 100));
      }
    }
  }
});
</script>

<style scoped>

</style>
