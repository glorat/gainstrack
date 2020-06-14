<template>
  <my-page padding>
    <div class="row">
      <div v-for="series in prices" class="col-lg-4">
        <template v-if="prices.length>0">
          <h6>{{ series.name }}</h6>
          <table class="sortable" style="margin: 5px">
            <thead>
            <th data-sort="string" data-sort-default="desc" data-order="asc">Date</th>
            <th data-sort="num">Trade Price</th>
            <th data-sort="num" v-if="series.cvalues[0]">Market Price</th>
            </thead>
            <tbody>
            <tr v-for="(date, index) in series.dates">
              <td>{{ date }}</td>
              <td class="num">{{ series.values[index] }} {{ series.units[index] }}</td>
              <td class="num" v-if="series.cvalues[0]">{{ series.cvalues[index] }} {{ series.units[index] }} {{
                series.cvalues2[index] }}
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
  import { FXChain, FXMapped, FXMarketLazyLoad, FXProxy, SingleFXConversion, SingleFXConverter } from '@/lib/fx';
  import { MyState, TimeSeries } from '@/store';
  import axios from 'axios';
  import Vue from 'vue';

  interface Price {
    name: string
    unit: string
    dates: string[]
    values: number[]
    cvalues: (number|undefined)[]
    cvalues2: (number|undefined)[]
  }

  export default Vue.extend({
    name: 'Prices',
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
        const state: MyState = this.$store.state;
        const allState = state.allState;
        if (allState) {
          const tradeFxData: { baseCcy: string; data: Record<string, { ks: string[]; vs: number[] }> } | undefined = allState.tradeFx;
          if (tradeFxData) {
            return SingleFXConversion.fromDTO(tradeFxData.data, tradeFxData.baseCcy);
          }
        }
        return SingleFXConversion.empty();
      },
      fxConverter(): SingleFXConverter {
        const lazyLoad = (nm: string) => this.$store.dispatch('loadQuotes', nm);

        const myState: MyState = this.$store.state;
        const quotes = myState.quotes;
        const allState = myState.allState;
        const tradeFxConverter = this.tradeFxConverter();
        const marketFx = SingleFXConversion.fromQuotes(quotes);
        const lazyMkt = new FXMarketLazyLoad(marketFx, lazyLoad);

        return new FXChain([
          new FXMapped(allState.fxMapper, lazyMkt),
          new FXProxy(allState.proxyMapper, tradeFxConverter, lazyMkt),
          tradeFxConverter,
        ]);

      },
      reloadQuotes() {
        const fx = this.fxConverter();
        this.prices.forEach(price => {

          const cvalues2 = price.dates.map(dt => {
            const val = fx.getFX(price.name.split('/')[0], price.name.split('/')[1], dt);
            return val ? Math.round(val*100)/100: undefined;
          });
          this.$set(price, 'cvalues2', cvalues2);
        });
      },
    },
    computed: {
      quotes(): Record<string, TimeSeries> {
        const myState: MyState = this.$store.state;
        const quotes = myState.quotes;
        return quotes;
      },

    },
    watch: {
      quotes: {
        handler() {
          // console.error('Quotes updated for Prices');
          // this.reloadQuotes();
        },
        deep: true,
      }
    },
    async mounted() {
      const notify = this.$notify;
      try {
        const response = await axios.get('/api/prices/');
        this.prices = response.data;
        // this.reloadQuotes();

      } catch (error) {
        notify.error(error);
      }

    }
  });
</script>

<style scoped>

</style>
