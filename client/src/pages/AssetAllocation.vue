<template>
    <div>
        <apexchart type="donut" :options="options" :series="series" height="250px"></apexchart>

        <div class="row">
            <div class="column" v-for="table in tables">
                <h3>{{ table.name }}</h3>
                <tree-table v-bind:node="table.rows"></tree-table>
            </div>
        </div>



    </div>
</template>

<script>
    import VueApexCharts from 'vue-apexcharts';
    import axios from 'axios';
    import TreeTable from '../components/TreeTable';

    export default {
        name: 'AssetAllocation',
        components: {TreeTable, apexchart: VueApexCharts},
        data() {
            return {
                options: {
                    chart: {
                        id: 'vuechart-aa-graph',
                        type: 'donut',
                    },
                    title: {
                        text: ''
                    },
                    labels: ['one', 'two'],
                },
                series: [100, 200],
                ccy: 'USD',
                tables: [],
            }
        },
        mounted() {
            const self = this;
            const notify = this.$notify;
            axios.get('/api/aa')
                .then(response => {
                    const data = response.data;
                    self.series = data.series;
                    self.options = {...self.options, ...{
                            labels: data.labels
                        }};
                    self.ccy = data.ccy;
                })
                .catch(error => notify.error(error));
            axios.get('/api/aa/table')
                .then(response => {
                    self.tables = response.data;
                })
                .catch(error => notify.error(error));
        },
    }
</script>

<style scoped>

</style>
