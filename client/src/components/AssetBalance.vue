<template>
  <q-table
    dense
    :data="myData"
    :columns="columns"
    :pagination.sync="pagination"
    row-key="unitCcy"
    :selection="selection"
    :selected.sync="selected"
  >
    <template v-slot:bottom-row>
      <q-tr>
        <q-td v-if="selection"/>
        <q-td>
          Total:
        </q-td>
        <q-td>
        </q-td>
        <q-td class="num">
          {{ totalValueStr }}
        </q-td>
        <q-td />
        <q-td />
      </q-tr>
    </template>
  </q-table>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {sum} from 'lodash';
  import {mapGetters} from 'vuex';
  import {Posting} from 'src/lib/models';

  import {SingleFXConverter} from 'src/lib/fx';
  import {assetRowsFromPostings, formatNumber, isSubAccountOf, AssetRow, formatPerc} from 'src/lib/utils';
  import { LocalDate } from '@js-joda/core';

  export default Vue.extend({
    name: 'AssetBalance',
    props: ['accountId'],
    data() {
      return {
        selection: 'multiple',
        selected: [],
        pagination: {
          rowsPerPage: 10
        },
      }
    },
    computed: {
      ...mapGetters(['allPostings', 'fxConverter', 'baseCcy']),
      today(): LocalDate {
        return LocalDate.now()
      },
      columns(): Record<string, unknown>[] {
        return [{
          name: 'unitCcy',
          label: 'Asset',
          classes: ['num'],
          field: 'unitCcy',
        },{
          name: 'units',
          label: 'Units',
          classes: ['num'],
          field: 'unitNumber',
          format:formatNumber
        }, {
          name: 'value',
          label: 'Value in ' + this.baseCcy,
          classes: ['num'],
          field: 'valueNumber',
          format:formatNumber
        }, {
          name: 'valuePerc',
          label: '%',
          classes: ['num'],
          field: (row:AssetRow) => row.valueNumber / this.totalValue,
          format:formatPerc
        }, {
          name: 'price',
          label: 'Price',
          classes: ['num'],
          field: (row:AssetRow) => row.price,
          format:formatNumber
        }, {
          name: 'priceDate',
          label: 'Latest Date',
          classes: ['num'],
          field: (row:AssetRow) => row.priceDate
        }].map(c => {
          return {...c, sortable: true,}
        })
      },
      myData(): AssetRow[] {
        const allPostings: Posting[] = this.allPostings;
        const myPostings = allPostings.filter(p => isSubAccountOf(p.account, this.accountId));
        const fx:SingleFXConverter = this.fxConverter;
        const valueCcy:string = this.baseCcy;
        const today: LocalDate = this.today;
        const assetRows = assetRowsFromPostings(myPostings, fx, valueCcy, today);

        return assetRows;
      },
      totalValue():number {
        const allVals = this.myData.map(row => row.valueNumber);
        return sum(allVals);
      },
      totalValueStr():string {
        return formatNumber(this.totalValue);
      }
    }
  })
</script>

<style scoped>

</style>
