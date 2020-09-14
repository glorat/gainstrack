<template>
    <vue-plotly :data="mySeries" :layout="layout" :options="options" auto-resize></vue-plotly>
</template>

<script lang="ts">
    import Vue from 'vue';
    import { VuePlotly } from '../lib/loader'
    import {mapGetters} from 'vuex';
    import {AccountDTO, Posting} from 'src/lib/models';
    import {
      convertedPositionSet,
      postingsByDate,
      postingsToPositionSet,
      positionSetAdd,
      isSubAccountOf
    } from 'src/lib/utils';
    import { keys, flatten, uniq } from 'lodash';
    import {LocalDate} from '@js-joda/core';
    //
    // const expMovingAverage = (array: {x:unknown, y: number}[], range:number) => {
    //     const k = 2 / (range + 1);
    //     // first item is just the same as the first item in the input
    //     const emaArray = [array[0]];
    //     // for the rest of the items, they are computed with the previous one
    //     for (let i = 1; i < array.length; i++) {
    //         emaArray.push({
    //             x: array[i].x,
    //             y: array[i].y * k + emaArray[i - 1].y * (1 - k)
    //         });
    //     }
    //     return emaArray;
    // };
    //
    // function unpack(rows:Record<string, unknown>[], key:string) {
    //     return rows.map(row => {
    //         return row[key];
    //     });
    // }

    export default Vue.extend({
        name: 'AccountGraph',
        components: {VuePlotly},
        props: ['accountId'],
        data() {
            return {
                // plotly
                // data: [{x: [1, 2, 3, 4, 5], y: [2, 4, 6, 8, 9]}],
                data: [] as any[],
                layout: {
                    autosize: true,
                    showlegend: true,
                    xaxis: {nticks: 20},
                    yaxis: {zeroline: true, hoverformat: ',.0f'},
                    height: 250,
                    margin: {
                        l: 30,
                        r: 30,
                        b: 30,
                        t: 30,
                        pad: 0
                    },
                },
                options: {
                    displaylogo: false
                },
            }
        },
      computed: {
        ...mapGetters([
          'findAccount',
          'allTxs',
          'fxConverter',
          'baseCcy',
        ]),
        myPostingsByDate(): {dates:string[], postings:Posting[][]} {
          const txs = this.allTxs;
          return postingsByDate(txs, (p:Posting)=> isSubAccountOf(p.account, this.accountId))
        },
        myAccount (): AccountDTO|undefined {
          return this.findAccount(this.accountId)
        },
        conversion (): string {
          return this.$store.state.allState.conversion;
        },
        mySeries():any {
          const account = this.myAccount;
          const conversion = this.conversion;
          const pByDate = this.myPostingsByDate;
          let poses:any[] = [];
          let pSetSoFar = {};
          for (let i=0;i<pByDate.dates.length; i++) {
            const posting = pByDate.postings[i];
            const pos = postingsToPositionSet(posting);
            const date = LocalDate.parse(pByDate.dates[i]);

            // Carefully sum on the non-converted pos
            pSetSoFar = positionSetAdd(pos, pSetSoFar);
            // But record the converted one
            const pset = convertedPositionSet(pSetSoFar, this.baseCcy,  conversion, date, account, this.fxConverter );
            poses.push(pset);
          }

          const ccys = uniq(flatten(poses.map(pos => keys(pos))));
          let ret:Record<string, any>[] = [];
          ccys.forEach(ccy => {
            const name = ccy;
            const x = pByDate.dates;
            const y = poses.map(pset => pset[name]);
            const type = 'scatter';
            ret.push({name, x, y, type});
          });
          return ret;

        }
      },
    })
</script>

<style scoped>

</style>
