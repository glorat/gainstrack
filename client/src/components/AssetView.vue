<template>
    <div>
        <div v-if="networthByAsset.length>0">
            <q-radio v-for="m in modes" :key="m.name" v-model="mode" :val="m.name" :label="m.label"/>
        </div>
        <q-table
                :data="filteredAssets"
                :columns="allColumns"
                :visible-columns="visibleColumns"
                :loading="loading"
                :pagination.sync="pagination"
                row-key="assetId"
                :selection="selection"
                :selected.sync="selected"
                dense
                v-if="networthByAsset.length>0 || loading"
        >
          <template v-slot:body-cell-units="props" v-if="canEdit">
            <q-td :props="props">
              {{ props.value }} <q-icon :name="matEdit" @click="onUnitsEdit(props)"></q-icon>
              <q-icon v-if="canTrade" :name="matAddCircleOutline" @click="onUnitsTrade(props)"></q-icon>
            </q-td>
          </template>
          <template v-slot:body-cell-price="props" v-if="canEdit">
            <q-td :props="props" @click="onAssetEdit(props)">
              {{ props.value }} <q-icon :name="matEdit"></q-icon>
            </q-td>
          </template>
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
      <q-btn color="primary" v-if="canEdit" :icon="matAdd" @click="onUnitsEdit({row: {units:0, assetId:''}})" label="Add Known Asset"></q-btn>
      <q-btn color="primary" v-if="canEdit" :icon="matAdd" @click="onNewAsset" label="Add New Asset"></q-btn>

      <q-btn color="secondary" @click="onRebalance" v-if="networthByAsset.length>1" label="Rebalance Calculator"></q-btn>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import { date } from 'quasar';
    import {NetworthByAsset, AssetColumn, AssetResponse} from '../lib/models';
    import {matEdit, matAdd, matAddCircleOutline ,matSwapHoriz} from '@quasar/extras/material-icons';
    import CommandEditorDialog from 'components/CommandEditorDialog.vue';
    import {mapGetters} from 'vuex';
    import {LocalDate} from '@js-joda/core';
    import AssetEditorDialog from 'components/AssetEditorDialog.vue';
    import {sum} from 'lodash';
    import {formatNumber, formatPerc} from 'src/lib/utils';
    import NewAssetDialog from "components/NewAssetDialog.vue";

    interface Mode {
        name: string
        label: string
        columns: string[]
        moreColumns: string
        filter: (nw: NetworthByAsset) => boolean
    }


    export default Vue.extend({
        name: 'AssetView',
        data() {
            const modes: Mode[] = [
                {
                    name: 'value',
                    label: 'Current Value',
                    columns: ['assetId', 'units', 'value', 'valuePerc', 'price', 'priceDate'],
                    moreColumns: '',
                    filter: nw => nw.units !== 0.0
                },
                {
                    name: 'market',
                    label: 'Market Returns',
                    columns: ['assetId', 'value', 'price'],
                    moreColumns: 'priceMove',
                    filter: nw => nw.units !== 0.0 && (nw.priceMoves['1d'] !== 0.0 || date.getDateDiff(date.subtractFromDate(Date.now(), { days: 4 }), nw.priceDate ?? '1900-01-01', 'days') < 0)
                }
            ];

            return {
                mode: 'value',
                modes,
                pagination: {
                  rowsPerPage: 10,
                  sortBy: 'value',
                  descending: true,
                },
              selection: 'multiple',
              selected: [],
              matEdit,
              matAdd,
              matSwapHoriz,
              matAddCircleOutline,

            };
        },
        props: {
          accountId: String,
            assetResponse: {
                type: Object as () => AssetResponse
            },
            loading: Boolean,
        },
      methods: {
        onUnitsEdit(props: { row: {units: number, assetId: string} }) {
          const today = LocalDate.now();
          const row/*: NetworthByAsset*/ = props.row;
          const cmd = {
            commandType: 'balunit',
            accountId: this.accountId,
            date: today.toString(),
            balance: {number:row.units, ccy: row.assetId},
          };

          this.$q.dialog({
            component: CommandEditorDialog,
            parent: this,
            cmd: cmd
            // ...more.props...
          })
        },
        onUnitsTrade(props: { row: {units: number, assetId: string} }) {
          const today = LocalDate.now();
          const row/*: NetworthByAsset*/ = props.row;
          const cmd = {
            commandType: 'trade',
            accountId: this.accountId,
            date: today.toString(),
            change: {number: undefined, ccy: row.assetId},
          };

          this.$q.dialog({
            component: CommandEditorDialog,
            parent: this,
            cmd: cmd
            // ...more.props...
          })
        },
        onNewAsset(props: any) {
          this.$q.dialog({
            component: NewAssetDialog,
            parent: this,
          })
        },
        onAssetEdit(props: any) {
          const row: NetworthByAsset = props.row;
          this.$q.dialog({
            component: AssetEditorDialog,
            parent: this,
            assetId: row.assetId
            // ...more.props...
          })
        },
        onRebalance():void {
          this.$router.push({name: 'rebalance', params: {accountId: this.accountId }});
        }
      },
        computed: {
          ...mapGetters(['mainAccounts', 'baseCcy', 'fxConverter']),
          columns(): AssetColumn[] {
            return [{
              name: 'assetId',
              label: 'Asset',
              field: 'assetId',
              align: 'left',
              sortable: true
            }, {
              name: 'units',
              field: 'units',
              label: 'Units',
              classes: ['num'],
              format: formatNumber
            }, {
              name: 'value',
              field: 'value',
              label: this.$store.getters.baseCcy + ' Value',
              classes: ['num'],
              sortable: true,
              format: formatNumber
            }, {
              name: 'valuePerc',
              label: '%',
              classes: ['num'],
              field: (row:NetworthByAsset) => row.value / this.totalValue,
              format:formatPerc
            }, {
              name: 'price',
              field: 'price',
              label: 'Price',
              classes: ['num'],
              format: formatNumber
            }, {
              name: 'priceDate',
              field: 'priceDate',
              label: 'Last Price Date',
              sortable: true,
              classes: ['num']
            }];
          },
          canEdit(): boolean {
            return !!this.accountId && this.mainAccounts.find( (x:string) => x===this.accountId) && !!this.accountId.match('^(Assets|Liabilities)');
          },
          canTrade(): boolean {
            // TODO: Exclude account baseccy?
            return this.canEdit;
          },
          totalValue():number {
            const allVals = this.filteredAssets.map(row => row.value);
            return sum(allVals);
          },
          totalValueStr():string {
            return formatNumber(this.totalValue);
          },
            currentMode(): Mode {
                const mode = this.modes.find(m => m.name === this.mode);
                if (mode) {
                    const more: AssetColumn[] = this.moreColumns.filter(x => x.tag === mode.moreColumns);
                    const ret = {
                        ...mode,
                        columns: mode.columns.concat(more.map(x => x.name))
                    };
                    return ret;
                } else {
                    return this.modes[0]; // Shouldn't happen but defensive
                }
            },
            filteredAssets(): NetworthByAsset[] {
                return this.networthByAsset.filter(this.currentMode.filter);
            },
            totalRows(): NetworthByAsset[] {
                return this.assetResponse.totals;
            },
            visibleColumns(): string[] {
                return this.currentMode.columns;
            },
            allColumns(): AssetColumn[] {
                return this.columns.concat(this.moreColumns);
            },
            networthByAsset(): NetworthByAsset[] {
                return this.assetResponse.rows;
            },
            moreColumns(): AssetColumn[] {
                return this.assetResponse.columns.map(col => {
                    return {
                        ...col,
                        field: row => row.priceMoves[col.name],
                        format: (val: number) => val ? `${(val * 100).toFixed(1)}%` : ''
                    } as AssetColumn;
                });
            },
        },
    });
</script>

<style scoped>

</style>
