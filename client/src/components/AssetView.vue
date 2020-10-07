<template>
    <div>
        <div>
            <q-radio v-for="m in modes" :key="m.name" v-model="mode" :val="m.name" :label="m.label"/>
        </div>
        <q-table
                :data="filteredAssets"
                :columns="allColumns"
                :visible-columns="visibleColumns"
                :loading="loading"
                :pagination.sync="pagination"
                dense
        >
          <template v-slot:body-cell-units="props" v-if="canEdit">
            <q-td :props="props" @click="onUnitsEdit(props)">
              {{ props.value }} <q-icon :name="matEdit"></q-icon>
            </q-td>
          </template>
        </q-table>
        <q-table :data="totalRows"
                 :columns="allColumns"
                 :visible-columns="visibleColumns"
                 :loading="loading"
                 dense
                 hide-bottom
        >
        </q-table>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import { date } from 'quasar';
    import {NetworthByAsset, AssetColumn, AssetResponse} from '../lib/models';
    import {matEdit} from '@quasar/extras/material-icons';
    import UnitEditorDialog from 'components/CommandEditorDialog.vue';
    import {mapGetters} from 'vuex';
    import {LocalDate} from "app/node_modules/@js-joda/core";

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
                    columns: ['assetId', 'units', 'value', 'price', 'priceDate'],
                    moreColumns: '',
                    filter: nw => nw.value !== 0.0
                },
                {
                    name: 'market',
                    label: 'Market Returns',
                    columns: ['assetId', 'value', 'price'],
                    moreColumns: 'priceMove',
                    filter: nw => nw.value !== 0.0 && (nw.priceMoves['1d'] !== 0.0 || date.getDateDiff(date.subtractFromDate(Date.now(), { days: 4 }), nw.priceDate ?? '1900-01-01', 'days') < 0)
                }
            ];

            const columns: AssetColumn[] = [{
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
                format: (val: number) => `${val.toFixed(2)}`
            }, {
                name: 'value',
                field: 'value',
                label: this.$store.getters.baseCcy + ' Value',
                classes: ['num'],
                sortable: true,
                format: (val: number) => `${val.toFixed(2)}`
            }, {
                name: 'price',
                field: 'price',
                label: 'Price',
                classes: ['num'],
                format: (val: number) => `${val.toFixed(2)}`
            }, {
                name: 'priceDate',
                field: 'priceDate',
                label: 'Last Price Date',
                sortable: true,
                classes: ['num']
            }];

            return {
                mode: 'value',
                modes,
                pagination: {
                    rowsPerPage: 10
                },
                columns,
              matEdit,
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
        onUnitsEdit(props: any) {
          const today = LocalDate.now().toString();
          const row: NetworthByAsset = props.row;
          const cmd = {
            commandType: 'unit',
            accountId: this.accountId,
            date: today,
            balance: {number:row.units, ccy: row.assetId},
            price: {number:row.price, ccy: this.baseCcy},

          };

          this.$q.dialog({
            component: UnitEditorDialog,

            parent: this,

            // props forwarded to component
            // (everything except "component" and "parent" props above):
            cmd: cmd
            // ...more.props...
          }).onOk(() => {
            // console.log('OK');
            // console.error(data.gainstrack);
          }).onCancel(() => {
            // console.log('Cancel')
          }).onDismiss(() => {
            // console.log('Called on OK or Cancel');
          })
        }
      },
        computed: {
          ...mapGetters(['mainAccounts', 'baseCcy']),
          canEdit(): boolean {
            // TODO: Check that accountId is a mainAccount
            return !!this.accountId && this.mainAccounts.find( (x:string) => x===this.accountId);
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
