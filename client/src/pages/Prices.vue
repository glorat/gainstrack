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
              <td class="num">{{ series.values[index] }} {{ series.units[index] }}</td>
              <td class="num" v-if="series.cvalues[0]">{{ series.cvalues[index] }} {{ series.units[index] }}
              </td>
            </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>

  </my-page>
</template>

<script lang="ts">
  import { SingleFXConversion, SingleFXConverter } from '../lib/fx';
  import { TimeSeries } from '../stores';
  import {defineComponent} from 'vue';
  import {useAppStore} from 'src/stores';
  import {LocalDate} from '@js-joda/core';

  interface Price {
    name: string
    unit: string
    dates: string[]
    values: number[]
    cvalues: (number|undefined)[]
    cvalues2: (number|undefined)[]
  }

  export default defineComponent({
    name: 'Prices',
    setup() { return { store: useAppStore() } },
    data() {
      return {
        prices: [/*
                    {
                        name: "GBP/USD",
                        unit: "USD",
                        dates: ['1','2'],
                        values: [0.6,0.7]
                    }*/
        ] as Price[]
      };
    },
    methods: {
      tradeFxConverter(): SingleFXConversion {
        const allState = this.store.allState;
        if (allState) {
          const tradeFxData: { baseCcy: string; data: Record<string, { ks: string[]; vs: number[] }> } | undefined = allState.tradeFx;
          if (tradeFxData) {
            return SingleFXConversion.fromDTO(tradeFxData.data, tradeFxData.baseCcy);
          }
        }
        return SingleFXConversion.empty();
      },
      fxConverter(): SingleFXConverter {
        return this.store.fxConverter as SingleFXConverter;
      },
      reloadQuotes() {
        const fx = this.fxConverter();
        this.prices.forEach(price => {
          const cvalues2 = price.dates.map(dt => {
            const val = fx.getFX(price.name.split('/')[0], price.name.split('/')[1], LocalDate.parse(dt));
            return val ? Math.round(val*100)/100: undefined;
          });
          price['cvalues2'] = cvalues2;
        });
      },
    },
    computed: {
      quotes(): Record<string, TimeSeries> {
        return this.store.quotes;
      },

    },
    watch: {
      quotes: {
        handler() {
          // console.error('Quotes updated for Prices');
          this.reloadQuotes();
        },
        deep: true,
      }
    },
    async mounted() {
      const notify = this.$notify;
      try {
        this.reloadQuotes();

      } catch (error) {
        const e:any = error;
        notify.error(e?.toString());
      }

    }
  });
</script>

<style scoped>

</style>
