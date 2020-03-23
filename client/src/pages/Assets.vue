<template>
    <my-page padding>
        <div>
            <q-radio v-for="m in modes" :key="m.name" v-model="mode" :val="m.name" :label="m.label"/>
        </div>
        <q-table
                title="Assets"
                :data="filteredAssets"
                :columns="allColumns"
                :visible-columns="visibleColumns"
                :loading="loading"
                :pagination.sync="pagination"
                dense
        />
    </my-page>
</template>

<script lang="ts">
    import Vue from 'vue';
    import axios from 'axios';
    import { sum } from 'lodash';
    import { date } from 'quasar';

    interface NetworthByAsset {
        assetId: string
        value: number
        price: number
        priceDate: string
    }

    interface Mode {
        name: string
        label: string
        columns: string[]
        moreColumns: string
        filter: (nw: NetworthByAsset) => boolean
    }

    interface AssetColumn {
        name: string,
        label: string | number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        field: string | ((row: any) => any)
        classes?: string[]
        align?: string
        sortable?: boolean
        format?: (val: number) => string
        tag?: string
        value?: string
    }

    export default Vue.extend({
        name: 'Assets',
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
                    filter: nw => nw.value !== 0.0 && date.getDateDiff(date.subtractFromDate(Date.now(), { days: 4 }), nw.priceDate, 'days') < 0
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
                label: 'Value',
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

            const moreColumns: AssetColumn[] = [];

            return {
                networthByAsset: [] as NetworthByAsset[],
                loading: true,
                mode: 'value',
                modes,
                pagination: {
                    rowsPerPage: 10
                },
                columns,
                moreColumns
            };
        },
        computed: {
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
            visibleColumns(): string[] {
                return this.currentMode.columns;
            },
            totalValue(): number {
                return sum(this.filteredAssets.map(x => x.value));
            },
            allColumns(): AssetColumn[] {
                return this.columns.concat(this.moreColumns);
            }
        },
        methods: {
            reloadAll(): Promise<void> {
                return axios.get('/api/assets/networth')
                        .then(response => {
                            this.networthByAsset = response.data.rows;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            this.moreColumns = response.data.columns.map((col: Record<string, any>) => {
                                return {
                                    ...col,
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    field: (row: any) => row.priceMoves[col.name],
                                    format: (val: number) => `${(val * 100).toFixed(1)}%`
                                };
                            });
                        })
                        .catch(error => {
                            this.$notify.error(error);
                        })
                        .finally(() => {
                            this.loading = false;
                        });
            }
        },
        mounted() {
            this.reloadAll();
        }
    });
</script>

<style scoped>

</style>
