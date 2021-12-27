<template>
  <my-page padding>
    <q-card>
      <q-card-section>
        Enter your annual income and expenses, and the current networth of your saved investment assets
      </q-card-section>
      <q-separator inset />
      <q-card-section>
        <q-input label="Income" type="number" v-model.number="input.income"></q-input>
        <q-input label="Expenses" type="number" v-model.number="input.expenses"></q-input>
        <q-input label="Savings Rate" type="number" v-on:input="onSavingsRateChange($event)" :value="100*input.expenses / input.income" suffix="%"></q-input>
        <q-input label="Networth" type="number" v-model.number="input.networth"></q-input>
      </q-card-section>
      <q-card-section>
        Your retirement objective will be met in year <span class="text-h3">{{ targetYear }}</span>
      </q-card-section>
    </q-card>
    <q-table :data="forecastEntries" :pagination="pagination"></q-table>
  </my-page>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import {ForecastStateEx, performForecast} from 'src/lib/forecast/forecast';
import {LocalDate} from '@js-joda/core';

export default defineComponent({
  name: 'ForecastView',
  data() {
    const income = 50000;
    const expenses = 20000;
    const networth = 0;
    const timeunit = LocalDate.now().year();
    const input = {
      timeunit,
      income,
      expenses,
      networth
    };

    const pagination = {rowsPerPage: 30}
    return {input, pagination}

  },
  computed: {
    forecastEntries():ForecastStateEx[] {
      let entries = performForecast(this.input);
      return entries;
    },
    targetYear():number {
      const e = this.forecastEntries
      return e[e.length-1].timeunit
    }
  },
  methods:{
    onSavingsRateChange(ev:string|number) {
      const newRate = +ev;
      if (newRate > 0 && newRate <=100) {
        this.input.expenses = this.input.income * (newRate/100);
      }
    }
  }
});
</script>

<style scoped>

</style>
