<template>
    <div>

    <div v-for="series in prices" class="left">
      <template v-if="prices.length>0">
        <h3>{{ series.name }}</h3>
        <table class="sortable">
            <thead>
            <th data-sort="string" data-sort-default="desc" data-order="asc">Date</th>
            <th data-sort="num">Trade Price</th>
            <th data-sort="num" v-if="series.cvalues[0]">Market Price</th>
            </thead>
            <tbody>
            <tr v-for="(date, index) in series.dates">
                <td>{{ date }}</td>
                <td class="num">{{ series.values[index] }} {{ series.units[index] }}</td>
                <td class="num" v-if="series.cvalues[0]">{{ series.cvalues[index] }} {{ series.units[index] }}</td>
            </tr>
            </tbody>
        </table>
      </template>
    </div>

    </div>
</template>

<script lang="ts">
    import axios from 'axios';
    import Vue from 'vue';

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
                ],
            };
        },
        mounted() {
            const notify = this.$notify;
            axios.get('/api/prices/')
                .then(response => this.prices = response.data)
                .catch(error => notify.error(error));
        },
    });
</script>

<style scoped>

</style>
