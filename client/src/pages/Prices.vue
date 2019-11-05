<template>
    <div>

    <div v-for="series in prices" v-if="prices.length>0" class="left">
        <h3>{{ series.name }}</h3>
        <table class="sortable">
            <thead>
            <th data-sort="string" data-sort-default="desc" data-order="asc">Date</th>
            <th data-sort="num">Price</th>
            </thead>
            <tbody>
            <tr v-for="(date, index) in series.dates">
                <td>{{ date }}</td>
                <td class="num">{{ series.values[index] }} {{ series.units[index] }}</td>
            </tr>
            </tbody>
        </table>
    </div>

    </div>
</template>

<script>
    import axios from 'axios';

    export default {
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
    };
</script>

<style scoped>

</style>
