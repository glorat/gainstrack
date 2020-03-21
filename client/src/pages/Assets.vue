<template>
    <my-page padding>
        <q-table
                title="Assets"
                :data="filteredAssets"
                :columns="columns"
                :loading="loading"
                dense
        />
    </my-page>
</template>

<script lang="ts">
    import Vue from 'vue';
    import axios from 'axios';
    import {sum} from 'lodash';

    interface NetworthByAsset {
        assetId: string
        value: number
        price: number
        priceDate: string
    }

    export default Vue.extend({
        name: 'Assets',
        data() {
            return {
                networthByAsset: [] as NetworthByAsset[],
                loading: true,
                columns: [{
                    name: 'assetId',
                    label: 'Asset',
                    field: 'assetId',
                    align: 'left',
                    sortable: true,
                },{
                    name: 'units',
                    field: 'units',
                    label: 'Units',
                    classes: ['num'],
                    format: (val:number) => `${val.toFixed(2)}`,
                },{
                    name: 'value',
                    field: 'value',
                    label: 'Value',
                    classes: ['num'],
                    sortable: true,
                    format: (val:number) => `${val.toFixed(2)}`,
                },{
                    name: 'price',
                    field: 'price',
                    label: 'Price',
                    classes: ['num'],
                    format: (val:number) => `${val.toFixed(2)}`,
                }
                ],
            };
        },
    computed: {
        filteredAssets(): NetworthByAsset[] {
            return this.networthByAsset.filter(nw => nw.value !== 0.0);
        },
        totalValue(): number {
            return sum(this.networthByAsset.map(x => x.value));
        }
    },
    methods: {
        reloadAll(): Promise<void> {
            return axios.get('/api/assets/networth')
                    .then(response => {
                        this.networthByAsset = response.data.networthByAsset;
                    })
                    .catch(error => {
                        this.$notify.error(error);
                    })
                    .finally(() => {
                        this.loading = false;
                    });
    },
    },
    mounted() {
        this.reloadAll();
    }
    });
</script>

<style scoped>

</style>
