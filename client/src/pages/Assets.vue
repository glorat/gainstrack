<template>
    <div>
        <h2>Networth By Asset</h2>
        <div v-for="rec in filteredAssets">
            {{ rec }}
        </div>
        <span>TOTAL: {{ totalValue }}</span>
    </div>
</template>

<script lang="ts">
    import axios from 'axios';
    import Vue from 'vue';
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
                networthByAsset: [] as NetworthByAsset[]
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
